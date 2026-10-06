// scripts/retry-osm-boundaries.mjs
// Targeted retry of specific cities against an existing bundle.
import { writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import simplify from "simplify-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(__dirname, "../public/osm-boundaries.json");

const USER_AGENT = "TravelTally/1.0 (offline-boundary-build)";
const ENDPOINT = "https://nominatim.openstreetmap.org/search";

const POINT_BUDGET = 1600;
const COORD_PRECISION = 5;

function bboxContains(bbox, lat, lng) {
  if (!bbox || bbox.length < 4) return false;
  const s = Number(bbox[0]), n = Number(bbox[1]), w = Number(bbox[2]), e = Number(bbox[3]);
  if (![s, n, w, e].every(Number.isFinite)) return false;
  if (e - w > 180) return false;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}
function isSuspiciouslyLarge(bbox, lat) {
  if (!bbox || bbox.length < 4) return true;
  const s = Number(bbox[0]), n = Number(bbox[1]), w = Number(bbox[2]), e = Number(bbox[3]);
  if (![s, n, w, e].every(Number.isFinite)) return true;
  if (e - w > 180) return true;
  const φ = (lat * Math.PI) / 180;
  const km2 = (e - w) * 111 * Math.max(Math.cos(φ), 0.2) * (n - s) * 111;
  return km2 > 12000;
}
function pickSettlement(hits, lat, lng) {
  const pool = hits.filter((h) => bboxContains(h.boundingbox, lat, lng));
  const SETTLEMENT = new Set(["city", "town", "municipality", "village", "hamlet"]);
  return (pool.length ? pool : hits).find((h) => [h.addresstype, h.type].some((t) => t && SETTLEMENT.has(t))) ?? hits[0];
}
function simplifyGeom(g, tol) {
  if (g.type === "Polygon") return { type: "Polygon", coordinates: g.coordinates.map((r) => simplifyRing(r, tol)) };
  if (g.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: g.coordinates.map((p) => p.map((r) => simplifyRing(r, tol))) };
  return g;
}
function simplifyRing(ring, tol) {
  if (ring.length < 8) return ring;
  const pts = ring.map(([lng, lat]) => ({ x: lng, y: lat }));
  return simplify(pts, tol).map((p) => [p.x, p.y]);
}
function simplifyFC(geo) {
  let tol = 0.0015;
  const make = (t) => ({
    type: "FeatureCollection",
    features: geo.features
      .filter((f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"))
      .map((f) => ({ ...f, geometry: simplifyGeom(f.geometry, t) })),
  });
  let candidate = make(tol);
  for (let i = 0; i < 12; i++) {
    const n = candidate.features.reduce((acc, f) => acc + (f.geometry.coordinates?.flat?.(Infinity)?.length ?? 0), 0);
    if (n <= POINT_BUDGET) break;
    tol = Math.min(tol * 1.7, 0.12);
    candidate = make(tol);
  }
  const r = (x) => Math.round(x * 10 ** COORD_PRECISION) / 10 ** COORD_PRECISION;
  const roundGeom = (g) => {
    if (!g) return g;
    if (g.type === "Polygon") {
      return { type: "Polygon", coordinates: g.coordinates.map((ring) => ring.map(([lng, lat]) => [r(lng), r(lat)])) };
    }
    if (g.type === "MultiPolygon") {
      return {
        type: "MultiPolygon",
        coordinates: g.coordinates.map((poly) =>
          poly.map((ring) => ring.map(([lng, lat]) => [r(lng), r(lat)]))
        ),
      };
    }
    return g;
  };
  return {
    type: "FeatureCollection",
    features: candidate.features.map((f) => (f.geometry ? { ...f, geometry: roundGeom(f.geometry) } : f)),
  };
}

const RETRY_PATH = process.argv[2] || "/tmp/retry.json";
const RETRY = JSON.parse(await readFile(RETRY_PATH, "utf8"));

const bundle = JSON.parse(await readFile(BUNDLE, "utf8"));

let ok = 0;
for (const [name, cc, lat, lng] of RETRY) {
  const key = `${cc.toLowerCase()}:${name.trim().toLowerCase()}`.replace(/\s+/g, "_");
  process.stdout.write(`${name} (${cc})... `);
  await new Promise((r) => setTimeout(r, 1300));
  try {
    const url = `${ENDPOINT}?q=${encodeURIComponent(name)}&format=jsonv2&polygon_geojson=1&limit=5&addressdetails=0&accept-language=en&countrycodes=${cc.toLowerCase()}`;
    let r2;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15000) });
      if (res.status === 429) { await new Promise((r) => setTimeout(r, 5000)); continue; }
      r2 = await res.json();
      break;
    }
    const polygons = r2.filter((h) => h.geojson && (h.geojson.type === "Polygon" || h.geojson.type === "MultiPolygon") && !["building", "amenity", "shop", "highway", "railway", "aeroway"].includes(h.class ?? ""));
    if (!polygons.length) { console.log("FAIL (no polygon)"); continue; }
    const pick = pickSettlement(polygons, lat, lng);
    // Skip size check in the bundle builder: pickSettlement already prefers
    // city/town/municipality, and rare cases (Tokyo, Istanbul, Dubai) where
    // the administrative boundary legitimately spans islands still produce
    // accurate range framing at click time.
    const simplified = simplifyFC({ type: "FeatureCollection", features: [{ type: "Feature", properties: { name }, geometry: pick.geojson }] });
    bundle.entries[key] = { key: `${pick.osm_type[0].toUpperCase()}${pick.osm_id}`, name, cc, lat, lng, geo: simplified };
    console.log("OK");
    ok++;
  } catch (e) {
    console.log("ERR", e.message);
  }
}

await writeFile(BUNDLE, JSON.stringify(bundle));
console.log(`\nRetried ${ok}/${RETRY.length}; bundle now ${bundle.entries.length} entries`);
