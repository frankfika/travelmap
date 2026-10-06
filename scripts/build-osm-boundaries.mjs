// scripts/build-osm-boundaries.mjs
//
// One-shot script that pulls a fixed list of city boundaries from Nominatim and
// packs them as a single static JSON at public/osm-boundaries.json. At runtime,
// lookupBoundary checks this file before hitting Nominatim, so verify-map.mjs
// (and a normal user session that adds a curated city) never has to wait on
// Nominatim's 1 req/sec queue or its occasional rate-limit flakiness.
//
// Usage: node scripts/build-osm-boundaries.mjs
//
// The list of cities to bundle lives at the top of the file — extend it if
// you need more offline coverage. Nominatim allows up to ~1 req/sec; with ~100
// cities that's a ~2 minute build. Re-run after major data updates.
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import simplify from "simplify-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/osm-boundaries.json");

const USER_AGENT = "TravelTally/1.0 (offline-boundary-build)";
const ENDPOINT = "https://nominatim.openstreetmap.org/search";

// Curated list. Names should match what's in defaultCities + ZH_ALIAS so the
// runtime lookup (keyed by "countryCode:Name.toLowerCase()") hits.
//
// Keep this list small (~100) — every entry adds ~50 KB and the bundle is
// shipped to every user. Add more as needed; the fallback to live Nominatim
// still works for everything not on this list.
const CITIES = [
  // High-traffic Asia
  { name: "Tokyo", cc: "JP", lat: 35.6895, lng: 139.6917 },
  { name: "Kyoto", cc: "JP", lat: 35.0116, lng: 135.7681 },
  { name: "Osaka", cc: "JP", lat: 34.6937, lng: 135.5023 },
  { name: "Sapporo", cc: "JP", lat: 43.0618, lng: 141.3545 },
  { name: "Nagoya", cc: "JP", lat: 35.1815, lng: 136.9066 },
  { name: "Fukuoka", cc: "JP", lat: 33.5904, lng: 130.4017 },
  { name: "Seoul", cc: "KR", lat: 37.566, lng: 126.9784 },
  { name: "Busan", cc: "KR", lat: 35.1796, lng: 129.0756 },
  { name: "Hong Kong", cc: "HK", lat: 22.3193, lng: 114.1694 },
  { name: "Taipei", cc: "TW", lat: 25.0478, lng: 121.5319 },
  { name: "Singapore", cc: "SG", lat: 1.2897, lng: 103.8501 },
  { name: "Bangkok", cc: "TH", lat: 13.754, lng: 100.5014 },
  { name: "Chiang Mai", cc: "TH", lat: 18.7904, lng: 98.9847 },
  { name: "Phuket", cc: "TH", lat: 7.8906, lng: 98.3981 },
  { name: "Manila", cc: "PH", lat: 14.6042, lng: 120.9822 },
  { name: "Kuala Lumpur", cc: "MY", lat: 3.1412, lng: 101.6865 },
  { name: "Jakarta", cc: "ID", lat: -6.2146, lng: 106.8451 },
  { name: "Denpasar", cc: "ID", lat: -8.65, lng: 115.2167 },
  { name: "Hanoi", cc: "VN", lat: 21.0285, lng: 105.8542 },
  { name: "Ho Chi Minh City", cc: "VN", lat: 10.823, lng: 106.6297 },
  { name: "Ulaanbaatar", cc: "MN", lat: 47.9077, lng: 106.8832 },
  { name: "Mumbai", cc: "IN", lat: 19.0728, lng: 72.8826 },
  { name: "Delhi", cc: "IN", lat: 28.6538, lng: 77.229 },
  { name: "New Delhi", cc: "IN", lat: 28.6358, lng: 77.2245 },
  { name: "Bangalore", cc: "IN", lat: 12.9719, lng: 77.5937 },
  { name: "Dubai", cc: "AE", lat: 25.2769, lng: 55.2962 },
  { name: "Doha", cc: "QA", lat: 25.2867, lng: 51.5333 },
  { name: "Istanbul", cc: "TR", lat: 41.0138, lng: 28.9497 },
  { name: "Cairo", cc: "EG", lat: 30.0626, lng: 31.2497 },

  // Africa
  { name: "Lagos", cc: "NG", lat: 6.4541, lng: 3.3947 },
  { name: "Kinshasa", cc: "CD", lat: -4.3276, lng: 15.3136 },
  { name: "Cape Town", cc: "ZA", lat: -33.9249, lng: 18.4241 },
  { name: "Johannesburg", cc: "ZA", lat: -26.2041, lng: 28.0473 },
  { name: "Marrakesh", cc: "MA", lat: 31.6295, lng: -7.9811 },
  { name: "Cairo", cc: "EG", lat: 30.0626, lng: 31.2497 },
  { name: "Addis Ababa", cc: "ET", lat: 9.032, lng: 38.747 },
  { name: "Nairobi", cc: "KE", lat: -1.2921, lng: 36.8219 },

  // Europe
  { name: "London", cc: "GB", lat: 51.5085, lng: -0.1257 },
  { name: "Paris", cc: "FR", lat: 48.8534, lng: 2.3488 },
  { name: "Rome", cc: "IT", lat: 41.8919, lng: 12.5113 },
  { name: "Venice", cc: "IT", lat: 45.4371, lng: 12.3327 },
  { name: "Milan", cc: "IT", lat: 45.4643, lng: 9.1895 },
  { name: "Florence", cc: "IT", lat: 43.7713, lng: 11.2486 },
  { name: "Naples", cc: "IT", lat: 40.8522, lng: 14.2681 },
  { name: "Barcelona", cc: "ES", lat: 41.3888, lng: 2.159 },
  { name: "Madrid", cc: "ES", lat: 40.4165, lng: -3.7026 },
  { name: "Lisbon", cc: "PT", lat: 38.7223, lng: -9.1393 },
  { name: "Porto", cc: "PT", lat: 41.1579, lng: -8.6291 },
  { name: "Berlin", cc: "DE", lat: 52.5244, lng: 13.4105 },
  { name: "Munich", cc: "DE", lat: 48.1351, lng: 11.582 },
  { name: "Hamburg", cc: "DE", lat: 53.5511, lng: 9.9937 },
  { name: "Vienna", cc: "AT", lat: 48.2085, lng: 16.3721 },
  { name: "Salzburg", cc: "AT", lat: 47.8095, lng: 13.055 },
  { name: "Zurich", cc: "CH", lat: 47.3769, lng: 8.5417 },
  { name: "Geneva", cc: "CH", lat: 46.2044, lng: 6.1432 },
  { name: "Amsterdam", cc: "NL", lat: 52.374, lng: 4.8897 },
  { name: "Brussels", cc: "BE", lat: 50.8505, lng: 4.3488 },
  { name: "Copenhagen", cc: "DK", lat: 55.6761, lng: 12.5683 },
  { name: "Stockholm", cc: "SE", lat: 59.3293, lng: 18.0686 },
  { name: "Oslo", cc: "NO", lat: 59.9139, lng: 10.7522 },
  { name: "Helsinki", cc: "FI", lat: 60.1699, lng: 24.9384 },
  { name: "Reykjavik", cc: "IS", lat: 64.1466, lng: -21.9426 },
  { name: "Prague", cc: "CZ", lat: 50.0755, lng: 14.4378 },
  { name: "Budapest", cc: "HU", lat: 47.4979, lng: 19.0402 },
  { name: "Vienna", cc: "AT", lat: 48.2085, lng: 16.3721 },
  { name: "Athens", cc: "GR", lat: 37.9838, lng: 23.7275 },
  { name: "Istanbul", cc: "TR", lat: 41.0138, lng: 28.9497 },
  { name: "Moscow", cc: "RU", lat: 55.7522, lng: 37.6156 },
  { name: "Saint Petersburg", cc: "RU", lat: 59.9311, lng: 30.3609 },

  // Americas
  { name: "New York City", cc: "US", lat: 40.7143, lng: -74.006 },
  { name: "Los Angeles", cc: "US", lat: 34.0522, lng: -118.2437 },
  { name: "San Francisco", cc: "US", lat: 37.7749, lng: -122.4194 },
  { name: "Seattle", cc: "US", lat: 47.6062, lng: -122.3321 },
  { name: "Chicago", cc: "US", lat: 41.8781, lng: -87.6298 },
  { name: "Boston", cc: "US", lat: 42.3601, lng: -71.0589 },
  { name: "Washington", cc: "US", lat: 38.9072, lng: -77.0369 },
  { name: "Miami", cc: "US", lat: 25.7617, lng: -80.1918 },
  { name: "Las Vegas", cc: "US", lat: 36.1699, lng: -115.1398 },
  { name: "Honolulu", cc: "US", lat: 21.3099, lng: -157.8581 },
  { name: "Toronto", cc: "CA", lat: 43.6532, lng: -79.3832 },
  { name: "Montreal", cc: "CA", lat: 45.5019, lng: -73.5674 },
  { name: "Vancouver", cc: "CA", lat: 49.2827, lng: -123.1207 },
  { name: "Mexico City", cc: "MX", lat: 19.4285, lng: -99.1277 },
  { name: "Lima", cc: "PE", lat: -12.0464, lng: -77.0428 },
  { name: "Bogota", cc: "CO", lat: 4.711, lng: -74.0721 },
  { name: "Santiago", cc: "CL", lat: -33.4489, lng: -70.6693 },
  { name: "Buenos Aires", cc: "AR", lat: -34.6037, lng: -58.3816 },
  { name: "Rio de Janeiro", cc: "BR", lat: -22.9068, lng: -43.1729 },
  { name: "Sao Paulo", cc: "BR", lat: -23.5505, lng: -46.6333 },

  // Oceania
  { name: "Sydney", cc: "AU", lat: -33.8679, lng: 151.2073 },
  { name: "Melbourne", cc: "AU", lat: -37.8136, lng: 144.9631 },
  { name: "Brisbane", cc: "AU", lat: -27.4698, lng: 153.0251 },
  { name: "Perth", cc: "AU", lat: -31.9505, lng: 115.8605 },
  { name: "Auckland", cc: "NZ", lat: -36.8485, lng: 174.7633 },
  { name: "Christchurch", cc: "NZ", lat: -43.532, lng: 172.6362 },

  // Add more here as needed.
];

// Polygon simplification budget — keep names below the budget by raising
// MAX_TOLERANCE on a per-city basis. 1600 points is the runtime budget.
const POINT_BUDGET = 1600;
const COORD_PRECISION = 5;

function bboxContains(bbox, lat, lng) {
  if (!bbox || bbox.length < 4) return false;
  const s = Number(bbox[0]);
  const n = Number(bbox[1]);
  const w = Number(bbox[2]);
  const e = Number(bbox[3]);
  if (![s, n, w, e].every(Number.isFinite)) return false;
  if (e - w > 180) return false;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

function isSuspiciouslyLarge(bbox, lat) {
  if (!bbox || bbox.length < 4) return true;
  const s = Number(bbox[0]);
  const n = Number(bbox[1]);
  const w = Number(bbox[2]);
  const e = Number(bbox[3]);
  if (![s, n, w, e].every(Number.isFinite)) return true;
  if (e - w > 180) return true;
  const φ = (lat * Math.PI) / 180;
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.max(Math.cos(φ), 0.2);
  const km2 = (e - w) * kmPerDegLng * (n - s) * kmPerDegLat;
  return km2 > 12_000;
}

function pickSettlement(hits, lat, lng) {
  const containing = hits.filter((h) => bboxContains(h.boundingbox, lat, lng));
  const pool = containing.length ? containing : hits;
  const SETTLEMENT = new Set(["city", "town", "municipality", "village", "hamlet"]);
  return pool.find((h) => [h.addresstype, h.type].some((t) => t && SETTLEMENT.has(t))) ?? pool[0];
}

function simplifyRing(ring, tolerance) {
  if (ring.length < 8) return ring;
  const pts = ring.map(([lng, lat]) => ({ x: lng, y: lat }));
  return simplify(pts, tolerance).map((p) => [p.x, p.y]);
}

function simplifyGeom(geom, tolerance) {
  if (geom.type === "Polygon") {
    return { type: "Polygon", coordinates: geom.coordinates.map((r) => simplifyRing(r, tolerance)) };
  }
  if (geom.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geom.coordinates.map((p) => p.map((r) => simplifyRing(r, tolerance))),
    };
  }
  return geom;
}

function countPoints(fc) {
  let n = 0;
  for (const f of fc.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Polygon") {
      for (const r of f.geometry.coordinates) n += r.length;
    } else if (f.geometry.type === "MultiPolygon") {
      for (const p of f.geometry.coordinates) for (const r of p) n += r.length;
    }
  }
  return n;
}

function simplifyFC(geo) {
  let tolerance = 0.0015;
  let candidate = {
    type: "FeatureCollection",
    features: geo.features
      .filter((f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"))
      .map((f) => ({ ...f, geometry: simplifyGeom(f.geometry, tolerance) })),
  };
  for (let i = 0; i < 12; i++) {
    if (countPoints(candidate) <= POINT_BUDGET) break;
    tolerance = Math.min(tolerance * 1.7, 0.12);
    candidate = {
      type: "FeatureCollection",
      features: geo.features.map((f) =>
        f.geometry
          ? { ...f, geometry: simplifyGeom(f.geometry, tolerance) }
          : f
      ),
    };
  }
  // round to COORD_PRECISION decimals (~1m at equator)
  const round = (n) => Math.round(n * 10 ** COORD_PRECISION) / 10 ** COORD_PRECISION;
  const walk = (g) => {
    if (g.type === "Polygon") {
      return { type: "Polygon", coordinates: g.coordinates.map((r) => r.map((p) => [round(p[0]), round(p[1])])) };
    }
    if (g.type === "MultiPolygon") {
      return {
        type: "MultiPolygon",
        coordinates: g.coordinates.map((p) => p.map((r) => r.map((pt) => [round(pt[0]), round(pt[1])]))),
      };
    }
    return g;
  };
  candidate = {
    type: "FeatureCollection",
    features: candidate.features.map((f) => (f.geometry ? { ...f, geometry: walk(f.geometry) } : f)),
  };
  return candidate;
}

async function fetchOne(city) {
  const params = new URLSearchParams({
    q: city.name,
    format: "jsonv2",
    polygon_geojson: "1",
    limit: "5",
    addressdetails: "0",
    "accept-language": "en",
    countrycodes: city.cc.toLowerCase(),
  });
  const url = `${ENDPOINT}?${params}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status === 429) {
        console.warn(`  429 (rate-limit) for ${city.name}, backing off 5s`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      if (!res.ok) {
        console.warn(`  HTTP ${res.status} for ${city.name}`);
        return null;
      }
      const hits = await res.json();
      const polygons = hits.filter(
        (h) =>
          h.geojson &&
          (h.geojson.type === "Polygon" || h.geojson.type === "MultiPolygon") &&
          !["building", "amenity", "shop", "highway", "railway", "aeroway"].includes(h.class ?? "")
      );
      if (!polygons.length) return null;
      const pick = pickSettlement(polygons, city.lat, city.lng);
      // Skip the runtime size check here: pickSettlement already prefers
      // city/town/municipality types. Administrative boundaries that span
      // islands (Tokyo, Istanbul, Dubai) are still legitimate city outlines.
      return { osmKey: `${pick.osm_type[0].toUpperCase()}${pick.osm_id}`, geo: pick.geojson, display: pick.display_name };
    } catch (e) {
      console.warn(`  attempt ${attempt} for ${city.name}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

async function main() {
  const out = { version: 1, at: new Date().toISOString(), entries: {} };
  console.log(`Fetching boundaries for ${CITIES.length} cities...`);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < CITIES.length; i++) {
    const c = CITIES[i];
    const key = `${c.cc.toLowerCase()}:${c.name.trim().toLowerCase()}`.replace(/\s+/g, "_");
    process.stdout.write(`[${String(i + 1).padStart(3)}/${CITIES.length}] ${c.name} (${c.cc})... `);
    const r = await fetchOne(c);
    if (!r) {
      console.log("FAIL");
      fail++;
    } else {
      const simplified = simplifyFC({ type: "FeatureCollection", features: [{ type: "Feature", properties: { name: c.name }, geometry: r.geo }] });
      out.entries[key] = {
        key: r.osmKey,
        name: c.name,
        cc: c.cc,
        lat: c.lat,
        lng: c.lng,
        geo: simplified,
      };
      const pts = countPoints(simplified);
      console.log(`OK (${pts} pts)`);
      ok++;
    }
    // Honour Nominatim's 1 req/sec policy.
    await new Promise((res) => setTimeout(res, 1100));
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  const sz = (JSON.stringify(out).length / 1024).toFixed(0);
  console.log(`\nDone: ${ok} ok, ${fail} fail. Wrote ${OUT} (${sz} KB).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
