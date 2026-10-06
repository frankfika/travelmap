import simplify from "simplify-js";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { deleteBoundary, getAllBoundaries, getBoundary, putBoundary } from "@/lib/boundaryStore";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
/** Static OSM city boundaries bundled at build time (see scripts/build-osm-boundaries.mjs).
 *  Loaded once on first lookup; hits here skip the Nominatim call entirely. */
const STATIC_BUNDLE = "./osm-boundaries.json";

/** Cached city outline returned to the page. */
export interface WorldBoundary {
  key: string;
  name: string;
  geo: FeatureCollection;
  /** "parent" — Nominatim reverse-geocoded a wider admin area because the
   *              city's own polygon was unavailable.
   *  "circle" — Nominatim returned no polygon, so we drew an approximate
   *              circle from the bounding box. */
  approx?: false | "parent" | "circle";
}

const memory = new Map<string, WorldBoundary>();
const lookupInflight = new Map<string, Promise<WorldBoundary | null>>();
/** Keys that failed this session — don't hammer Nominatim retrying them. */
const failed = new Set<string>();

/** Serial queue: Nominatim asks for at most one request per second. */
let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastCall));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return job();
  });
  queue = run.catch(() => undefined);
  return run as Promise<T>;
}

/* ------------------------------------------------------------------ */
/* Geometry simplification                                             */
/* ------------------------------------------------------------------ */

function round(n: number): number {
  const f = 10 ** COORD_PRECISION;
  return Math.round(n * f) / f;
}

const COORD_PRECISION = 5;
const START_TOLERANCE = 0.0015;
const MAX_TOLERANCE = 0.12;
const POINT_BUDGET = 1600;

function countPoints(fc: FeatureCollection): number {
  let n = 0;
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const visit = (geom: Geometry) => {
      if (geom.type === "Polygon") {
        for (const ring of geom.coordinates) n += ring.length;
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) for (const ring of poly) n += ring.length;
      }
    };
    visit(f.geometry);
  }
  return n;
}

function simplifyRing(ring: Position[], tolerance: number): Position[] {
  if (ring.length < 8) return ring;
  const pts = ring.map(([lng, lat]) => ({ x: lng, y: lat }));
  const out = simplify(pts, tolerance).map((p) => [round(p.x), round(p.y)] as Position);
  return out;
}

function mapGeometry(geom: Geometry, tolerance: number): Geometry {
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geom.coordinates.map((ring) => simplifyRing(ring, tolerance)),
    } as Geometry;
  }
  if (geom.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geom.coordinates.map((poly) =>
        poly.map((ring) => simplifyRing(ring, tolerance))
      ),
    } as Geometry;
  }
  return geom;
}

/** Keep only polygons, simplify to the point budget, and drop specks. */
function cleanCollection(geo: FeatureCollection): FeatureCollection {
  const polygonal = geo.features.filter(
    (f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
  );
  const source: FeatureCollection = { type: "FeatureCollection", features: polygonal as Feature[] };
  if (!source.features.length) return source;

  let tolerance = START_TOLERANCE;
  let candidate = source;
  // Ease the tolerance up until the outline fits the budget.
  for (let i = 0; i < 12; i++) {
    candidate = {
      type: "FeatureCollection",
      features: source.features.map((f) => ({
        ...f,
        geometry: mapGeometry(f.geometry as Geometry, tolerance),
      })) as Feature[],
    };
    if (countPoints(candidate) <= POINT_BUDGET) break;
    tolerance = Math.min(tolerance * 1.7, MAX_TOLERANCE);
  }
  return candidate;
}

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

let warmed = false;
let warmPromise: Promise<void> = Promise.resolve();
/** Lazy static-bundle load. Fetched on first miss in the IDB cache. */
let staticBundlePromise: Promise<Map<string, WorldBoundary>> | null = null;
function loadStaticBundle(): Promise<Map<string, WorldBoundary>> {
  if (staticBundlePromise) return staticBundlePromise;
  staticBundlePromise = (async () => {
    try {
      const res = await fetch(STATIC_BUNDLE);
      if (!res.ok) return new Map();
      const data = (await res.json()) as { entries?: Record<string, Omit<WorldBoundary, "key"> & { key: string }> };
      const m = new Map<string, WorldBoundary>();
      for (const [k, v] of Object.entries(data.entries ?? {})) {
        m.set(k, { key: v.key, name: v.name, geo: v.geo, approx: v.approx });
      }
      return m;
    } catch {
      return new Map();
    }
  })();
  return staticBundlePromise;
}

/** Pull every persisted city outline into memory once per session. */
export function warmWorldCache(): Promise<void> {
  if (warmed) return warmPromise;
  warmed = true;
  warmPromise = (async () => {
    const all = await getAllBoundaries();
    for (const b of all) {
      if (!b.key.startsWith(STORE_PREFIX)) continue;
      const osmKey = b.key.slice(STORE_PREFIX.length);
      memory.set(osmKey, {
        key: osmKey,
        name: b.name ?? osmKey,
        geo: b.geo,
        approx: (b as { approx?: WorldBoundary["approx"] }).approx,
      });
    }
  })();
  return warmPromise;
}

// Kick off the warm immediately on module load so the first lookupBoundary call
// has a real warmPromise to wait on (the previous default `Promise.resolve()`
// lied — the warm would happen later, the lookup would run sooner, and every
// reload would re-query Nominatim for the cities we already had on disk).
warmWorldCache();

const STORE_PREFIX = "world:";

function persist(b: WorldBoundary, alias?: string) {
  void putBoundary({
    key: STORE_PREFIX + b.key,
    geo: b.geo,
    name: b.name,
    at: Date.now(),
    approx: b.approx,
  });
  if (alias && alias !== b.key) {
    void putBoundary({
      key: STORE_PREFIX + alias,
      geo: b.geo,
      name: b.name,
      at: Date.now(),
      approx: b.approx,
    });
  }
}

/** Cache key for a city name + country, used before we know the OSM id. */
export function boundaryKey(name: string, countryCode: string): string {
  return `${countryCode.trim().toLowerCase()}:${name.trim().toLowerCase()}`.replace(/\s+/g, "_");
}

export function peekBoundary(key: string): WorldBoundary | null {
  return memory.get(key) ?? null;
}

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

interface NominatimHit {
  display_name?: string;
  osm_type?: string;
  osm_id?: number;
  osm_class?: string;
  osm_type_tag?: string;
  /** Nominatim's own classification, e.g. "city", "administrative". */
  addresstype?: string;
  geojson?: Geometry;
  boundingbox?: string[];
  type?: string;
  class?: string;
  lat?: string;
  lon?: string;
}

/**
 * Resolve a city to its outline.
 *
 * `key` is what we cache under (typically `boundaryKey(name, cc)`).
 *
 * `lat`/`lng` are the GeoNames coordinates of the city centre. They are used
 * to pick the candidate whose bbox actually contains the point (out of the
 * top few results) and as a fallback when no polygon is returned.
 */
export function lookupBoundary(
  key: string,
  name: string,
  countryCode: string,
  lat?: number,
  lng?: number
): Promise<WorldBoundary | null> {
  // Warm the cache before checking memory. The IDB read on first warm is
  // fast (single getAll), and without this any lookup that races against
  // App.tsx's useEffect would miss the persisted boundary and re-query
  // Nominatim for nothing.
  // First hit: static build-time bundle (no network at all on a cached page).
  // Second hit: in-memory map (warmed from IDB on mount).
  // Third hit: IDB persisted entry (legacy storage).
  // Fallback: live Nominatim search → reverse → bbox-circle.
  return warmWorldCache().then(async () => {
    const cached = peekBoundary(key);
    if (cached) return cached;
    if (failed.has(key)) return null;
    const running = lookupInflight.get(key);
    if (running) return running;

    const task = enqueue(async () => {
      const recheck = peekBoundary(key);
      if (recheck) return recheck;

      // Consult the static build-time bundle. If present we skip IDB AND
      // Nominatim entirely (the bundle is rebuilt by build-osm-boundaries.mjs
      // and shipped at ./osm-boundaries.json).
      try {
        const bundle = await loadStaticBundle();
        const b = bundle.get(key);
        if (b) {
          memory.set(b.key, b);
          memory.set(key, b);
          return b;
        }
      } catch {
        // Network miss → fall through to IDB + Nominatim.
      }

      const stored = await getBoundary(STORE_PREFIX + key);
      if (stored) {
        const fromStore: WorldBoundary = {
          key,
          name: stored.name ?? name,
          geo: stored.geo,
          approx: (stored as { approx?: WorldBoundary["approx"] }).approx,
        };
        memory.set(key, fromStore);
        return fromStore;
      }

      const params = new URLSearchParams({
        q: name,
        format: "jsonv2",
        polygon_geojson: "1",
        limit: "5",
        addressdetails: "0",
        "accept-language": "en",
      });
      if (countryCode && /^[A-Za-z]{2}$/.test(countryCode)) {
        params.set("countrycodes", countryCode.toLowerCase());
      }

      let res: Response;
      try {
        res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(12000) });
      } catch {
        return null;
      }
      if (!res.ok) {
        if (res.status !== 429) failed.add(key);
        return null;
      }

      let hits: NominatimHit[];
      try {
        hits = (await res.json()) as NominatimHit[];
      } catch {
        failed.add(key);
        return null;
      }

      // Drop polygons that obviously aren't a city outline (buildings, roads,
      // shops, etc.). City/place relations have `class=null`; admin boundaries
      // have `class=boundary`; everything else is suspicious.
      const polygonCandidates = hits.filter(
        (h) =>
          h.geojson &&
          (h.geojson.type === "Polygon" || h.geojson.type === "MultiPolygon") &&
          !REJECTED_CLASS.has(h.class ?? "")
      );
      const pointCandidates = hits.filter(
        (h) => h.geojson?.type !== "Polygon" && h.geojson?.type !== "MultiPolygon"
      );

      const SIZE_LIMIT_KM2 = 12_000;

      let hit: NominatimHit | undefined;
      let approx: WorldBoundary["approx"] = false;
      let hitKind: "polygon" | "parent" | "circle" | undefined;

      if (polygonCandidates.length) {
        const pick = pickPolygon(polygonCandidates, lat, lng);
        if (!isSuspiciouslyLarge(pick.boundingbox, SIZE_LIMIT_KM2, lat)) {
          hit = pick;
          hitKind = "polygon";
        }
      }

      if (!hit && typeof lat === "number" && typeof lng === "number") {
        const rev = await enqueue(() => reverseAdminArea(lat, lng, countryCode));
        if (rev && !isSuspiciouslyLarge(rev.boundingbox, SIZE_LIMIT_KM2, lat)) {
          hit = rev;
          hitKind = "parent";
          approx = "parent";
        }
      }

      if (!hit) {
        const pt = pointCandidates[0] ?? hits[0];
        if (pt) {
          const geom = approxCircleFromBbox(
            pt.boundingbox,
            lat ?? Number(pt.lat),
            lng ?? Number(pt.lon)
          );
          if (geom) {
            hit = { ...pt, geojson: geom };
            hitKind = "circle";
            approx = "circle";
          }
        }
      }

      // Parent and circle fallbacks MUST keep the per-city name key, otherwise
      // two small towns in the same county collide on the county's OSM id and
      // their labels merge into one.
      const useNameKey = hitKind === "parent" || hitKind === "circle";

      const geom = hit?.geojson;
      if (!geom) {
        failed.add(key);
        return null;
      }

      const osmKey =
        hit!.osm_type && hit!.osm_id ? `${hit!.osm_type[0].toUpperCase()}${hit!.osm_id}` : key;
      const boundary: WorldBoundary = {
        key: useNameKey ? key : osmKey,
        name: hit!.display_name?.split(",")[0]?.trim() || name,
        geo: cleanCollection({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: {}, geometry: geom }],
        }),
        approx,
      };
      if (!boundary.geo.features.length) {
        failed.add(key);
        return null;
      }

      memory.set(boundary.key, boundary);
      if (!useNameKey) memory.set(key, boundary);
      persist({ ...boundary, key: boundary.key }, key);
      return boundary;
    });

    lookupInflight.set(key, task);
    return task;
  });
}

/** Nominatim `class` values that are definitely NOT a city outline. Everything
 *  else is allowed: city/place relations have `class=null`, admin boundaries
 *  have `class=boundary`. Allow-listing `class` alone was too narrow. */
const REJECTED_CLASS = new Set([
  "building",
  "amenity",
  "shop",
  "highway",
  "railway",
  "aeroway",
  "tourism",
  "historic",
  "leisure",
  "landuse",
  "natural",
  "waterway",
  "man_made",
  "place_of_worship",
  "public_transport",
  "craft",
  "office",
  "emergency",
  "military",
  "healthcare",
  "education",
]);

/** Reject polygonal hits whose bounding box is way too big to be a city
 *  (e.g. a Swedish "kommun" at 43k km² for a 23k-person town). */
function isSuspiciouslyLarge(
  bbox: string[] | undefined,
  limitKm2: number,
  lat?: number
): boolean {
  if (!bbox || bbox.length < 4) return true;
  const s = Number(bbox[0]);
  const n = Number(bbox[1]);
  const w = Number(bbox[2]);
  const e = Number(bbox[3]);
  if (![s, n, w, e].every(Number.isFinite)) return true;
  if (e - w > 180) return true;
  const φ = typeof lat === "number" ? (lat * Math.PI) / 180 : 0.7;
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.max(Math.cos(φ), 0.2);
  const km2 = (e - w) * kmPerDegLng * (n - s) * kmPerDegLat;
  return km2 > limitKm2;
}

/**
 * Choose the boundary that best represents the *city* rather than its parent.
 *
 * In practice Nominatim already ranks the city before the parent (verified for
 * Osaka, Salzburg, Kyoto, São Paulo and Sydney), so we keep that relevance order
 * and only step in when the top containing hit is a parent while a settlement
 * hit also contains the point.
 */
function pickPolygon(hits: NominatimHit[], lat?: number, lng?: number): NominatimHit {
  if (typeof lat !== "number" || typeof lng !== "number") return hits[0];

  const containing = hits.filter((h) => bboxContains(h.boundingbox, lat, lng));
  const pool = containing.length ? containing : hits;

  const SETTLEMENT = new Set(["city", "town", "municipality", "village", "hamlet"]);
  const isSettlement = (h: NominatimHit) =>
    [h.addresstype, h.type].some((t) => t && SETTLEMENT.has(t));

  return pool.find(isSettlement) ?? pool[0];
}

function bboxContains(bbox: string[] | undefined, lat: number, lng: number): boolean {
  const b = parseBbox(bbox);
  if (!b) return false;
  const [w, s, e, n] = b;
  if (e - w > 180) return false; // antimeridian-wrapping bbox; refuse rather than mislead
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

function parseBbox(bbox: string[] | undefined): [number, number, number, number] | null {
  if (!bbox || bbox.length < 4) return null;
  const s = Number(bbox[0]);
  const n = Number(bbox[1]);
  const w = Number(bbox[2]);
  const e = Number(bbox[3]);
  if (![s, n, w, e].every(Number.isFinite)) return null;
  return [w, s, e, n];
}

/**
 * Build a rough circular polygon from a Nominatim bounding box, centred on the
 * GeoNames point (falling back to the bbox centre). 32 points is plenty.
 *
 * Radius is the box's north-south span (the honest one); the longitude radius
 * is stretched by 1/cos(lat) so the result is a circle on the ground — and
 * therefore also a circle on screen, because Web Mercator is conformal.
 */
function approxCircleFromBbox(
  bbox: string[] | undefined,
  lat?: number,
  lng?: number
): Geometry | null {
  if (!bbox || bbox.length < 4) return null;
  const s = Number(bbox[0]);
  const n = Number(bbox[1]);
  const w = Number(bbox[2]);
  const e = Number(bbox[3]);
  if ([s, n, w, e].some((v) => !Number.isFinite(v))) return null;
  const centreLat = lat ?? (s + n) / 2;
  const centreLng = lng ?? (w + e) / 2;
  const rLat = Math.max(Math.abs(n - s) / 2, 0.03);
  const cosLat = Math.max(Math.cos((centreLat * Math.PI) / 180), 0.15);
  const rLng = Math.min(rLat / cosLat, 20);
  const N = 32;
  const ring: Position[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    ring.push([centreLng + Math.cos(t) * rLng, centreLat + Math.sin(t) * rLat]);
  }
  ring.push([ring[0][0], ring[0][1]]);
  return { type: "Polygon", coordinates: [ring] };
}

async function reverseAdminArea(
  lat: number,
  lng: number,
  countryCode: string
): Promise<NominatimHit | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    polygon_geojson: "1",
    zoom: "10",
    addressdetails: "0",
    "accept-language": "en",
  });
  try {
    const res = await fetch(`${REVERSE_ENDPOINT}?${params}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const hit = (await res.json()) as NominatimHit;
    if (hit.geojson && (hit.geojson.type === "Polygon" || hit.geojson.type === "MultiPolygon")) {
      return hit;
    }
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Bulk helpers                                                        */
/* ------------------------------------------------------------------ */

/** Everything currently in memory. `warmWorldCache()` fills this from IDB. */
export function allCachedBoundaries(): WorldBoundary[] {
  const out = new Map<string, WorldBoundary>();
  for (const v of memory.values()) out.set(v.key, v);
  return [...out.values()];
}

/** Settings action: forget every cached city outline. */
export async function clearWorldCache(): Promise<void> {
  memory.clear();
  lookupInflight.clear();
  failed.clear();
  warmed = false;
  warmPromise = Promise.resolve();
  const all = await getAllBoundaries();
  await Promise.all(
    all.filter((b) => b.key.startsWith(STORE_PREFIX)).map((b) => deleteBoundary(b.key))
  );
}
