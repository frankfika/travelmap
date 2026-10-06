import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvent,
  useMapEvents,
} from "react-leaflet";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { AdminLevel, Place } from "@/types";
import { COUNTRY_ADCODE, loadBoundaries } from "@/lib/boundaries";
import { ancestorsOf, levelOf } from "@/lib/adcode";
import type { WorldBoundary } from "@/lib/worldBoundaries";
import { useStore } from "@/hooks/useStore";
import { colorHex } from "@/lib/colors";

export type MapMode = "world" | "china" | "backdrop";

/** A region the user hit on the map (province / city / district). */
export interface RegionHit {
  adcode: string;
  name: string;
  level: AdminLevel;
  /** Region centre as [lat, lng]. */
  center: [number, number];
}

/** How lit the region layer is, split by how the visit was recorded. */
export interface RegionState {
  /** adcode → visits recorded *directly* on that region (you clicked it). */
  lit: Record<string, number>;
  /** adcode → visits including everything recorded below it (roll-up for parents). */
  rollup: Record<string, number>;
}

interface Props {
  mode: MapMode;
  places: Place[];
  /** China only: render this region's children (defaults to the whole country). */
  drillAdcode?: string;
  /** China only: which regions are lit, and why. */
  regionState?: RegionState;
  /** Single click on a region: light it up. */
  onRegionToggle?: (region: RegionHit) => void;
  /** Double click on a region: descend into it. */
  onRegionDrill?: (region: RegionHit) => void;
  /** Resolved city outlines for the rest of the world. */
  worldBoundaries?: WorldBoundary[];
  /** Adcodes a friend has and you don't — drawn as dashed "still to go" outlines. */
  pending?: Set<string>;
}

const VIEW: Record<MapMode, { center: [number, number]; zoom: number }> = {
  world: { center: [28, 30], zoom: 3 },
  china: { center: [35, 104], zoom: 4 },
  backdrop: { center: [30, 20], zoom: 2 },
};

const CHINA_BOUNDS = L.latLngBounds([10, 65], [56, 145]);

/** The single accent used for lit regions — the same warm tone as the markers. */
const LIT_FILL = "#e0b566";

const icons = new Map<string, L.DivIcon>();
function markerIcon(color: string, selected: boolean) {
  const key = color + selected;
  if (!icons.has(key)) {
    icons.set(
      key,
      L.divIcon({
        html: `<div class="tt-marker${selected ? " is-selected" : ""}" style="color:${colorHex(color)}"><span></span></div>`,
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
    );
  }
  return icons.get(key)!;
}

/** Escape a place name before it goes into divIcon HTML. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

/**
 * World-map marker: a small colour-coded dot with the city name always
 * visible next to it. The label lives inside the marker element so that
 * clicking the name selects the place exactly like clicking the dot.
 */
const worldIcons = new Map<string, L.DivIcon>();
function worldMarkerIcon(color: string, labelHtml: string, selected: boolean, hasOutline: boolean) {
  // Keyed by everything that changes the markup, so the cache stays bounded by
  // the set of places rather than growing on every render.
  const key = `${color}|${labelHtml}|${selected}|${hasOutline}`;
  if (!worldIcons.has(key)) {
    worldIcons.set(
      key,
      L.divIcon({
        html:
          `<div class="tt-world${selected ? " is-selected" : ""}` +
          `${selected && hasOutline ? " has-outline" : ""}" style="color:${colorHex(color)}">` +
          `<span class="tt-world-dot"></span>` +
          `<span class="tt-label${selected ? " is-selected" : ""}">${labelHtml}</span>` +
          `</div>`,
        className: "",
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })
    );
  }
  return worldIcons.get(key)!;
}

/** Turn a slug of GeoJSON into the bounds Leaflet would draw. */
function boundsOf(fc: FeatureCollection): L.LatLngBounds | null {
  try {
    const bounds = L.geoJSON(fc).getBounds();
    return bounds.isValid() ? bounds : null;
  } catch {
    return null;
  }
}

/** [west, south, east, north] for one polygon's rings, or null if empty. */
type Box = [number, number, number, number];
function ringsBounds(rings: Position[][]): Box | null {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const ring of rings) {
    for (const pt of ring) {
      const lng = Number(pt[0]);
      const lat = Number(pt[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      if (lng < w) w = lng;
      if (lng > e) e = lng;
      if (lat < s) s = lat;
      if (lat > n) n = lat;
    }
  }
  return w <= e && s <= n ? [w, s, e, n] : null;
}

/** Every polygon of a geometry, as a ring set. */
function polygonsOf(geom: Geometry): Position[][][] {
  if (geom.type === "Polygon") return [geom.coordinates as Position[][]];
  if (geom.type === "MultiPolygon") return geom.coordinates as Position[][][];
  return [];
}

/**
 * The bounds worth framing for a city, given its anchor point.
 *
 * Administrative outlines lie: Tokyo Metropolis includes islands 1000 km to the
 * south, so fitting the raw extent zooms out to a mostly-empty ocean. Keep only
 * the polygons that actually sit near the city, and fall back to the full
 * extent if none of them do.
 *
 * Only single-feature outlines (everything we get from OSM) are trimmed. A
 * Chinese province arrives as a FeatureCollection of its child cities, which
 * are separate places, not stray fragments of one — trimming those would cut
 * real range off (重庆 would lose its eastern districts).
 */
function focusBounds(fc: FeatureCollection, lat: number, lng: number): L.LatLngBounds | null {
  const full = boundsOf(fc);
  if (!full) return null;

  const features = fc.features.filter((f) => f.geometry);
  if (features.length !== 1) return full;
  const parts = polygonsOf(features[0].geometry!).filter((rings) => rings.length);
  if (parts.length <= 1) return full;

  const boxes = parts.map((rings) => ringsBounds(rings)).filter((b): b is Box => b !== null);
  if (!boxes.length) return full;

  // A whole-world box means the ring wraps the antimeridian; reframing is not
  // meaningful there, so show everything.
  const wonky = boxes.some((b) => b[2] - b[0] > 180);
  if (wonky) return full;

  // Anchor on the part the city actually sits in, then allow siblings that are
  // genuinely next to it. The tolerance scales with the anchor's own size so
  // this works for both a small town and a sprawling municipality.
  const contains = (b: Box) => lat >= b[1] && lat <= b[3] && lng >= b[0] && lng <= b[2];
  const dist = (b: Box) => {
    const dx = Math.max(b[0] - lng, 0, lng - b[2]);
    const dy = Math.max(b[1] - lat, 0, lat - b[3]);
    return Math.hypot(dx, dy);
  };
  const anchor = boxes.find(contains) ??
    boxes.reduce((best, b) => (dist(b) < dist(best) ? b : best), boxes[0]);
  const span = Math.max(anchor[2] - anchor[0], anchor[3] - anchor[1]);
  const tol = Math.max(0.25, span);

  let box: Box | null = null;
  for (const b of boxes) {
    if (!contains(b) && dist(b) > tol) continue;
    box = box
      ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])]
      : b;
  }
  if (!box) return full;
  return L.latLngBounds([box[1], box[0]], [box[3], box[2]]);
}

/** Flies to the drilled region, and to whichever place is selected. */
function Controller({
  places,
  geo,
  drillAdcode,
  mode,
  selectedBounds,
  nonce,
}: Pick<Props, "places" | "mode"> & {
  geo: FeatureCollection | null;
  drillAdcode: string;
  /** The selected place's outline bounds — world mode only. */
  selectedBounds: L.LatLngBounds | null;
  /** Bumped on every pin click so re-clicking a city re-centres it. */
  nonce: number;
}) {
  const map = useMap();
  const selectedId = useStore((s) => s.selectedId);
  const selectPlace = useStore((s) => s.selectPlace);
  const selected = places.find((p) => p.id === selectedId);
  /** The selection we last framed, so re-renders don't re-trigger a flyTo. */
  const framed = useRef<string | null>(null);

  useMapEvent("click", () => selectPlace(null));

  // Dev-only handle so the screenshot/e2e scripts can drive and inspect the
  // map without guessing at Leaflet internals.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __ttMap?: L.Map };
    w.__ttMap = map;
    return () => {
      if (w.__ttMap === map) delete w.__ttMap;
    };
  }, [map]);

  useEffect(() => {
    if (!selected) {
      framed.current = null;
      return;
    }
    if (mode === "china") {
      const key = `${selected.id}|c${drillAdcode}`;
      if (framed.current === key) return;
      framed.current = key;
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 5), { duration: 0.9 });
      return;
    }
    // World mode: frame the city's outline so you actually see its range.
    //
    // The outline is fetched at ~1 city/second, so a click often lands before
    // it arrives. The key therefore records *what* we framed: when the outline
    // shows up for the same selection the key changes from "p" (point) to "b"
    // (bounds) and we re-frame. `nonce` lets a repeat click on the same city
    // re-centre it after the user has panned away.
    const key = `${selected.id}|${selectedBounds ? "b" : "p"}|${nonce}`;
    if (framed.current === key) return;
    framed.current = key;
    if (selectedBounds) {
      // PlaceDrawer opens on the right (360 px wide + 16 px gap) and covers the
      // framed outline if we don't push the bounds left.
      const size = map.getSize();
      const drawer = Math.min(376, Math.round(size.x * 0.6));
      const padX = Math.min(70, Math.floor((size.x - drawer) / 2 - 1));
      const padRight = Math.min(70 + drawer, Math.floor(size.x / 2 - 1));
      map.flyToBounds(selectedBounds, {
        duration: 1,
        paddingTopLeft: [padX, 70],
        paddingBottomRight: [padRight, 70],
        maxZoom: 11,
      });
    } else {
      map.flyTo([selected.lat, selected.lng], 9, { duration: 1 });
    }
  }, [selected?.id, map, mode, selectedBounds, nonce, drillAdcode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-frame whenever we descend or come back up.
  useEffect(() => {
    if (mode !== "china" || !geo) return;
    try {
      const layer = L.geoJSON(geo);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.flyToBounds(bounds, { duration: 0.9, padding: [40, 40], maxZoom: drillAdcode === COUNTRY_ADCODE ? 5 : 9 });
      }
    } catch {
      /* ignore malformed geometry */
    }
  }, [drillAdcode, geo, mode, map]);

  return null;
}

/**
 * Greedy label declutter for the world view.
 *
 * Each lit place gets a permanent Leaflet tooltip rendered at its centre. The
 * tooltip is a child of the map's pane, so its absolute position tracks the
 * map view. We re-measure on every move/zoom and hide any label whose bounding
 * box overlaps one drawn earlier in the queue.
 *
 * ponytail: O(n²) — fine for a few hundred cities; if a user crosses a
 * thousand we'd want a quadtree or a native canvas overlay instead.
 */
function LabelDecluter({ keys, selectedId }: { keys: string[]; selectedId: string | null }) {
  const map = useMap();
  function declutter() {
    const root = map.getContainer();
    const labels = Array.from(root.querySelectorAll<HTMLElement>(".tt-label"));
    if (!labels.length) return;
    // Highest priority first: selected, then everything else in DOM order
    // (which follows the order we passed them in — most-recent first inside
    // their own group is fine).
    const sel: HTMLElement[] = [];
    const rest: HTMLElement[] = [];
    for (const el of labels) (el.classList.contains("is-selected") ? sel : rest).push(el);
    const ordered = [...sel, ...rest];
    const taken: DOMRect[] = [];
    for (const el of ordered) {
      el.classList.remove("is-hidden");
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // Inflate by a few px so neighbours don't kiss.
      const pad = 4;
      const overlap = taken.some(
        (t) =>
          r.left - pad < t.right &&
          r.right + pad > t.left &&
          r.top - pad < t.bottom &&
          r.bottom + pad > t.top
      );
      if (overlap) {
        el.classList.add("is-hidden");
      } else {
        taken.push(r);
      }
    }
  }
  useMapEvents({
    zoomend: declutter,
    moveend: declutter,
  });
  // Re-run whenever the set of labels changes, and whenever the selection
  // changes — selecting swaps a marker's icon, which rebuilds its DOM and
  // drops the is-hidden class.
  useEffect(() => {
    declutter();
    // Run again on the next frame so the DOM has settled.
    const id = requestAnimationFrame(declutter);
    return () => cancelAnimationFrame(id);
  }, [keys.join("|"), selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function MapView({
  mode,
  places,
  drillAdcode,
  regionState,
  onRegionToggle,
  onRegionDrill,
  worldBoundaries,
  pending,
}: Props) {
  const theme = useStore((s) => s.theme);
  const selectedId = useStore((s) => s.selectedId);
  const selectPlace = useStore((s) => s.selectPlace);
  const [geo, setGeo] = useState<{ region: string; data: FeatureCollection } | null>(null);
  const interactive = mode !== "backdrop";

  const region = drillAdcode ?? COUNTRY_ADCODE;
  const lit = regionState?.lit ?? {};
  const rollup = regionState?.rollup ?? {};

  /** Latest places, so map event handlers never see a stale closure. */
  const placesRef = useRef(places);
  placesRef.current = places;
  const drawnOutlines = useMemo(
    () => new Set(worldBoundaries?.map((b) => b.key) ?? []),
    [worldBoundaries]
  );

  /**
   * Group the visible places by the boundary they'll be drawn with, in priority
   * order (boundaryKey > adcode > cityId). The first place in a group owns the
   * marker and the permanent label; later visits ride along via the count.
   */
  const labelGroups = useMemo(() => {
    const groups = new Map<
      string,
      { places: Place[]; center: [number, number]; displayName: string; color: Place["color"] }
    >();
    for (const p of places) {
      const key = p.boundaryKey ?? (p.adcode && p.countryCode === "CN" ? `cn:${p.adcode}` : null) ?? p.id;
      const hit = groups.get(key);
      if (hit) hit.places.push(p);
      else
        groups.set(key, {
          places: [p],
          center: [p.lat, p.lng],
          displayName: p.name,
          color: p.color,
        });
    }
    return [...groups.entries()];
  }, [places]);

  /** China-outlines cache for the world view, keyed by adcode. */
  const [worldCnGeo, setWorldCnGeo] = useState<Record<string, FeatureCollection>>({});

  /** Bumped on each pin click so clicking a city again re-frames it. */
  const [frameNonce, setFrameNonce] = useState(0);
  const worldCnGeoRef = useRef(worldCnGeo);
  worldCnGeoRef.current = worldCnGeo;
  useEffect(() => {
    if (mode !== "world") return;
    const codes = new Set<string>();
    for (const p of places) {
      if (p.countryCode === "CN" && p.adcode && p.adcode.length === 6 && !p.boundaryKey) {
        codes.add(p.adcode);
      }
    }
    if (!codes.size) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, FeatureCollection> = {};
      // Group by province — one network round-trip per province, then filter
      // the children to find the requested city/district.
      const byProvince = new Map<string, string[]>();
      for (const adcode of codes) {
        const province = adcode.slice(0, 2) + "0000";
        if (!byProvince.has(province)) byProvince.set(province, []);
        byProvince.get(province)!.push(adcode);
      }
      for (const [province, wantCodes] of byProvince) {
        const provinceData = await loadBoundaries(province);
        if (cancelled) return;
        if (!provinceData?.features?.length) continue;
        for (const code of wantCodes) {
          // Use ref so this guard doesn't depend on `worldCnGeo` and re-run.
          if (worldCnGeoRef.current[code]) continue;
          // Province-level visits (e.g. recording 四川) match the province
          // feature directly.
          if (code === province) {
            updates[code] = provinceData;
            continue;
          }
          // Try the province's children first (works for districts and for
          // cities whose _full.json includes a self feature).
          const exact = provinceData.features.find(
            (f: Feature) => String(f.properties?.adcode ?? "") === code
          );
          if (exact) {
            updates[code] = {
              type: "FeatureCollection",
              features: [exact],
            };
            continue;
          }
          // Some cities publish their own boundary file (510100, 440100, ...).
          try {
            const res = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${code}.json`);
            if (res.ok) {
              const own = (await res.json()) as FeatureCollection;
              if (own?.features?.length) {
                updates[code] = own;
                continue;
              }
            }
          } catch {
            /* fall through */
          }
          // Last resort for "province-as-city" cases (Beijing, Shanghai,
          // Tianjin, Chongqing — 直辖市). The province outline *is* the city
          // outline at world zoom, so use the province feature as an
          // approximation rather than rendering nothing.
          if (code === province.slice(0, 2) + "0100" && !updates[code]) {
            updates[code] = provinceData;
          }
        }
      }
      if (cancelled) return;
      if (Object.keys(updates).length) {
        setWorldCnGeo((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, places]);

  useEffect(() => {
    if (mode !== "china") return;
    let cancelled = false;
    setGeo(null);
    loadBoundaries(region).then((data) => {
      // Wrap in a fresh object: the loader caches by adcode and may hand back
      // the very same FeatureCollection when you navigate back up a level.
      if (!cancelled && data) setGeo({ region, data });
    });
    return () => {
      cancelled = true;
    };
  }, [mode, region]);

  /**
   * The outline bounds of the selected place. In world mode this is what makes
   * a clicked city read as a *range* rather than a point: the map frames the
   * outline, and city outlines are far too small to see at global zoom.
   */
  const selectedBounds = useMemo(() => {
    if (mode !== "world") return null;
    const sel = places.find((p) => p.id === selectedId);
    if (!sel) return null;
    const osm = sel.boundaryKey ? worldBoundaries?.find((b) => b.key === sel.boundaryKey) : undefined;
    const fc = osm?.geo ?? (sel.adcode ? worldCnGeo[sel.adcode] : undefined);
    if (!fc) return null;
    return focusBounds(fc, sel.lat, sel.lng);
  }, [mode, places, selectedId, worldBoundaries, worldCnGeo]);

  // Single click lights a region up; double click descends into it.
  const clickTimer = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (clickTimer.current) window.clearTimeout(clickTimer.current);
    };
  }, []);

  const handleRegionClick = (region: RegionHit) => {
    if (clickTimer.current) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onRegionDrill?.(region);
      return;
    }
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null;
      onRegionToggle?.(region);
    }, 240);
  };

  const ink = theme === "dark" ? "#ffffff" : "#000000";
  // Re-render the layer only when the lit set actually changes.
  const geoKey = useMemo(
    () =>
      region +
      theme +
      Object.entries(rollup)
        .map(([k, v]) => `${k}:${v}`)
        .sort()
        .join(","),
    [region, theme, rollup]
  );

  return (
    <MapContainer
      center={VIEW[mode].center}
      zoom={VIEW[mode].zoom}
      zoomSnap={0.2}
      minZoom={mode === "china" ? 3 : 2}
      maxZoom={14}
      maxBounds={mode === "china" ? CHINA_BOUNDS : undefined}
      maxBoundsViscosity={0.8}
      worldCopyJump={mode !== "china"}
      zoomControl={false}
      attributionControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={false}
      touchZoom={interactive}
      keyboard={interactive}
      className="h-full w-full"
    >
      <TileLayer
        key={theme}
        attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${theme === "dark" ? "Dark" : "Light"}_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
        maxNativeZoom={16}
      />

      {mode === "china" && geo && (
        <GeoJSON
          key={geo.region + geoKey}
          data={geo.data}
          style={(f) => {
            const code = String(f?.properties?.adcode ?? "");
            const direct = lit[code] ?? 0;
            const rolled = rollup[code] ?? 0;
            // Three states:
            //   lit      — you recorded this exact region
            //   rolled   — a region below it is lit (a city inside this province)
            //   covered  — its immediate parent is lit, but this one is not broken down
            const isLit = direct > 0;
            const isRolled = !isLit && rolled > 0;
            const parent = ancestorsOf(code)[0];
            const isCovered = !isLit && !isRolled && !!parent && (lit[parent] ?? 0) > 0;
            // A friend's "you haven't been here" region: dashed, not filled.
            const isPending = !isLit && !isRolled && !isCovered && !!pending?.has(code);

            const cls = isLit
              ? "tt-region tt-region--lit"
              : isRolled
                ? "tt-region tt-region--rolled"
                : isCovered
                  ? "tt-region tt-region--covered"
                  : isPending
                    ? "tt-region tt-region--pending"
                    : "tt-region";
            const filled = isLit || isRolled || isCovered;
            return {
              className: cls,
              color: isPending ? LIT_FILL : ink,
              weight: isLit ? 1.1 : isRolled ? 0.8 : isPending ? 0.9 : 0.55,
              opacity: isLit ? 0.55 : isRolled ? 0.42 : isCovered ? 0.3 : isPending ? 0.5 : 0.14,
              fillColor: isPending ? LIT_FILL : filled ? LIT_FILL : ink,
              fillOpacity: isLit
                ? Math.min(0.2 + direct * 0.1, 0.5)
                : isRolled
                  ? 0.14
                  : isCovered
                    ? 0.07
                    : isPending
                      ? 0.05
                      : 0,
            };
          }}
          onEachFeature={(f, layer) => {
            const props = f.properties ?? {};
            const code = String(props.adcode ?? "");
            const name = String(props.name ?? "");
            const direct = lit[code] ?? 0;
            const rolled = rollup[code] ?? 0;
            const level = levelOf(code);
            // GeoJSON centres are [lng, lat]; Leaflet wants [lat, lng].
            const raw = props.center ?? props.centroid;
            const center: [number, number] = Array.isArray(raw)
              ? [Number(raw[1]), Number(raw[0])]
              : [0, 0];

            const badge = direct ? `${direct} 次` : !direct && rolled ? `含 ${rolled} 次` : "";
            const hint = pending?.has(code) && !direct ? "待点亮" : level === "district" ? "单击点亮" : "单击点亮 · 双击进入";
            layer.bindTooltip(
              `<span class="tt-tt-name">${name}</span>${badge ? `<span class="tt-tt-n">${badge}</span>` : ""}<span class="tt-tt-hint">${hint}</span>`,
              { sticky: true, direction: "top", className: "tt-tooltip" }
            );

            layer.on("click", (e) => {
              L.DomEvent.stopPropagation(e);
              if (interactive) handleRegionClick({ adcode: code, name, level, center });
            });
          }}
        />
      )}

      {/* World mode: every resolved city outline, painted in. */}
      {mode === "world" && (
        <>
          {/* OSM city outlines (foreign cities) */}
          {worldBoundaries?.map((b) => {
            const visits = places.filter((p) => p.boundaryKey === b.key);
            const n = visits.length;
            const selected = visits.some((p) => p.id === selectedId);
            return (
              <GeoJSON
                key={b.key}
                data={b.geo}
                style={{
                  className: `tt-region tt-region--lit osm-${b.key}${b.approx ? " tt-region--approx" : ""}`,
                  color: LIT_FILL,
                  weight: selected ? 1.6 : 1.1,
                  opacity: 0.85,
                  fillColor: LIT_FILL,
                  fillOpacity: Math.min(0.3 + n * 0.1, 0.55),
                  dashArray: b.approx ? "4 3" : undefined,
                }}
                onEachFeature={(_f, layer) => {
                  // Resolve the owner at click time, not from the render
                  // closure: places can be deleted after the layer is mounted,
                  // and the closure would still see the deleted owner.
                  layer.on("click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    const current = placesRef.current.filter((p) => p.boundaryKey === b.key);
                    const owner = current[0];
                    if (!owner) return;
                    selectPlace(owner.id);
                    setFrameNonce((n) => n + 1);
                  });
                }}
              />
            );
          })}

          {/* Chinese cities on the world map: reuse the same DataV outlines
              the China view uses, so they look identical. Pruned to adcodes
              that some current place actually uses, so deleting a city also
              removes its stale outline. */}
          {(() => {
            const wanted = new Set(
              places.filter((p) => p.countryCode === "CN" && p.adcode).map((p) => p.adcode!)
            );
            return Object.entries(worldCnGeo)
              .filter(([adcode]) => wanted.has(adcode))
              .map(([adcode, fc]) => {
            const visits = places.filter((p) => p.adcode === adcode && p.countryCode === "CN");
            const n = visits.length;
            const selected = visits.some((p) => p.id === selectedId);
            return (
              <GeoJSON
                key={`cn-world-${adcode}`}
                data={fc}
                style={{
                  className: `tt-region tt-region--lit cn-${adcode}`,
                  color: LIT_FILL,
                  weight: selected ? 1.8 : 1.1,
                  opacity: selected ? 1 : 0.85,
                  fillColor: LIT_FILL,
                  fillOpacity: Math.min(0.3 + n * 0.1, 0.55),
                }}
                onEachFeature={(_f: Feature, layer) => {
                  layer.on("click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    const current = placesRef.current.filter((p) => p.adcode === adcode && p.countryCode === "CN");
                    const owner = current[0];
                    if (!owner) return;
                    selectPlace(owner.id);
                    setFrameNonce((n) => n + 1);
                  });
                }}
              />
            );
          });
          })()}

          {/* One labelled pin per place: a colour-coded dot with the city name
              always visible, so the map reads as "这些城市我去过" instead of a
              scatter of anonymous dots. The label is inside the marker element,
              so clicking the name behaves exactly like clicking the dot. */}
          {labelGroups.map(([key, group]) => {
            const [lat, lng] = group.center;
            const n = group.places.length;
            const owner = group.places[0];
            const sel = group.places.some((p) => p.id === selectedId);
            const labelHtml =
              `${esc(group.displayName)}` +
              (n > 1 ? `<span class="tt-label-count">×${n}</span>` : "");
            // Once a city's range is actually drawn, the dot is redundant —
            // the outline is the marker now. The dot stays for places whose
            // outline is still loading or unavailable, so nothing vanishes.
            const hasOutline = Boolean(
              (owner.boundaryKey && worldBoundaries?.some((b) => b.key === owner.boundaryKey)) ||
                (owner.adcode && owner.countryCode === "CN" && worldCnGeo[owner.adcode])
            );
            return (
              <Marker
                key={key}
                position={[lat, lng]}
                icon={worldMarkerIcon(group.color, labelHtml, sel, hasOutline)}
                interactive={interactive}
                zIndexOffset={sel ? 1000 : 0}
                // Make the marker focusable; Leaflet fires `click` on Enter/Space,
                // so the event handler below already covers both pointer and
                // keyboard activation.
                keyboard={interactive}
                title={group.displayName}
                alt={group.displayName}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    selectPlace(owner.id);
                    setFrameNonce((n) => n + 1);
                  },
                }}
              />
            );
          })}

          <LabelDecluter keys={labelGroups.map(([k]) => k)} selectedId={selectedId} />
        </>
      )}

      {interactive && (
        <Controller
          places={places}
          geo={geo?.data ?? null}
          drillAdcode={region}
          mode={mode}
          selectedBounds={selectedBounds}
          nonce={frameNonce}
        />
      )}

      {/*
        A dot is a fallback, not a duplicate:
          - a place whose outline is actually drawn doesn't need one
          - a place whose outline is missing (expired cache, failed lookup,
            still loading) keeps its dot so it never vanishes silently
          - Chinese adcode fills replace the dot only inside the China view,
            because the world view never loads those boundaries
      */}
      {places
        .filter((p) => {
          if (mode === "world") {
            // World view paints its own outline *and* label for every place;
            // a separate coloured marker would just stack a dot on top of the
            // region fill and look messy.
            return false;
          }
          if (p.boundaryKey) return !drawnOutlines.has(p.boundaryKey);
          if (p.level) return mode !== "china";
          return true;
        })
        .map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={markerIcon(p.color, p.id === selectedId)}
            interactive={interactive}
            eventHandlers={{ click: () => selectPlace(p.id) }}
          >
            {interactive && (
              <Tooltip direction="top" offset={[0, -8]} className="tt-tooltip">
                {p.name}
              </Tooltip>
            )}
          </Marker>
        ))}
    </MapContainer>
  );
}
