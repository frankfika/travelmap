import type { FeatureCollection } from "geojson";
import {
  deleteBoundary,
  getAllBoundaries,
  getBoundary,
  putBoundary,
} from "@/lib/boundaryStore";

/**
 * Administrative boundaries for China, three levels deep.
 *
 * Source: DataV.GeoAtlas (https://datav.aliyun.com/portal/school/atlas/area_selector)
 *   - `100000` (country) is bundled locally as public/china-provinces.json
 *   - every other code comes from `{adcode}_full.json`, which returns that
 *     region's immediate children (province → cities, city → districts)
 *   - leaf districts have no children, so we fall back to `{adcode}.json`,
 *     the district's own outline
 */

const CDN = "https://geo.datav.aliyun.com/areas_v3/bound";

export const COUNTRY_ADCODE = "100000";

const memory = new Map<string, FeatureCollection>();
const inflight = new Map<string, Promise<FeatureCollection | null>>();

export { ancestryOf, ancestorsOf, isAdcode, levelOf, provinceCodeOf } from "@/lib/adcode";

/** Outlines live in IndexedDB; this map only makes them synchronous to read. */
let warmed = false;

/** Pull every persisted Chinese outline into memory once per session. */
export async function warmBoundaryCache(): Promise<void> {
  if (warmed) return;
  warmed = true;
  const all = await getAllBoundaries();
  for (const b of all) {
    if (b.key.startsWith("cn:")) memory.set(b.key.slice(3), b.geo);
  }
}

async function fetchJson(url: string): Promise<FeatureCollection | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as FeatureCollection;
}

/**
 * Load the boundaries to render for a given region.
 *
 * Returns the region's children when it has any, otherwise the region's own
 * outline (so a district still renders as a filled shape).
 */
export function loadBoundaries(adcode: string): Promise<FeatureCollection | null> {
  const key = String(adcode);
  const cached = memory.get(key);
  if (cached) return Promise.resolve(cached);

  const running = inflight.get(key);
  if (running) return running;

  const task = (async () => {
    if (key !== COUNTRY_ADCODE) {
      const stored = await getBoundary(`cn:${key}`);
      if (stored) {
        memory.set(key, stored.geo);
        return stored.geo;
      }
    }

    const url =
      key === COUNTRY_ADCODE ? "./china-provinces.json" : `${CDN}/${key}_full.json`;

    try {
      let data = await fetchJson(url);
      if (!data && key !== COUNTRY_ADCODE) {
        // Leaf region: no children, use its own outline.
        data = await fetchJson(`${CDN}/${key}.json`);
      }
      if (!data) return null;

      memory.set(key, data);
      if (key !== COUNTRY_ADCODE) {
        void putBoundary({ key: `cn:${key}`, geo: data, at: Date.now() });
      }
      return data;
    } catch (err) {
      console.error(`Failed to load boundaries for ${key}:`, err);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

/** Warm the cache for a region without rendering it. */
export function prefetchBoundaries(adcode: string) {
  void loadBoundaries(adcode);
}

/** Settings action: forget every cached Chinese outline. */
export async function clearBoundaryCache(): Promise<void> {
  memory.clear();
  inflight.clear();
  warmed = false;
  const all = await getAllBoundaries();
  await Promise.all(
    all.filter((b) => b.key.startsWith("cn:")).map((b) => deleteBoundary(b.key))
  );
}
