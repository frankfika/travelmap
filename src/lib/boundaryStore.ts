import type { FeatureCollection } from "geojson";
import { BOUNDARY_STORE, getDB } from "@/lib/db";

/**
 * Persistent store for administrative outlines (both the Chinese adcode sets
 * and the OSM city outlines). IndexedDB rather than localStorage because these
 * are big and absolutely must not compete with the user's own records.
 */

export interface StoredBoundary {
  /** "cn:510100" for adcodes, "world:R71525" for OSM relations. */
  key: string;
  geo: FeatureCollection;
  name?: string;
  at: number;
  /** Whether this outline is an approximate fallback. World only. */
  approx?: false | "parent" | "circle";
}

const LS_PREFIX = "tt-bnd:v1:";
const WORLD_LS_PREFIX = "tt-world:v1:";

export async function getBoundary(key: string): Promise<StoredBoundary | undefined> {
  try {
    const db = await getDB();
    return (await db.get(BOUNDARY_STORE, key)) as StoredBoundary | undefined;
  } catch {
    return undefined;
  }
}

export async function putBoundary(value: StoredBoundary): Promise<void> {
  try {
    const db = await getDB();
    await db.put(BOUNDARY_STORE, value);
  } catch {
    // Out of space or private-mode restrictions: the in-memory cache still
    // serves this session, and we never touch the user's own records.
  }
}

export async function getAllBoundaries(): Promise<StoredBoundary[]> {
  try {
    const db = await getDB();
    return (await db.getAll(BOUNDARY_STORE)) as StoredBoundary[];
  } catch {
    return [];
  }
}

export async function clearBoundaries(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(BOUNDARY_STORE);
  } catch {
    /* ignore */
  }
}

export async function deleteBoundary(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(BOUNDARY_STORE, key);
  } catch {
    /* ignore */
  }
}

/**
 * Move outlines written by older versions out of localStorage and free the
 * quota they were occupying. Safe to call on every boot.
 */
export async function migrateLegacyBoundaryCache(): Promise<number> {
  if (typeof localStorage === "undefined") return 0;
  const legacy: string[] = [];
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(LS_PREFIX) || k.startsWith(WORLD_LS_PREFIX)) legacy.push(k);
    }
  } catch {
    return 0;
  }
  if (!legacy.length) return 0;

  let moved = 0;
  for (const lsKey of legacy) {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { at?: number; name?: string; geo?: FeatureCollection; data?: FeatureCollection };
        const geo = parsed.geo ?? parsed.data;
        if (geo) {
          const isWorld = lsKey.startsWith(WORLD_LS_PREFIX);
          const code = lsKey.slice((isWorld ? WORLD_LS_PREFIX : LS_PREFIX).length);
          await putBoundary({
            key: isWorld ? `world:${code}` : `cn:${code}`,
            geo,
            name: parsed.name,
            at: parsed.at ?? Date.now(),
          });
          moved++;
        }
      }
      localStorage.removeItem(lsKey);
    } catch {
      // A corrupt entry is worthless; drop it rather than keep eating quota.
      try {
        localStorage.removeItem(lsKey);
      } catch {
        /* ignore */
      }
    }
  }
  return moved;
}
