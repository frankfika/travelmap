import type { Place } from "@/types";
import { ancestryOf, isAdcode } from "@/lib/adcode";
import type { RegionState } from "@/components/MapView";

/**
 * Translate places into "which regions are lit, and why".
 *
 *   lit    — regions with a record recorded directly on them (solid fill)
 *   rollup — lit plus their ancestors, so a province can show "has visits"
 *
 * Keeping this out of the page components means the shared (read-only) map
 * renders identically to your own.
 */
export function computeRegionState(places: Place[]): RegionState {
  const lit: Record<string, number> = {};
  const rollup: Record<string, number> = {};

  for (const p of places) {
    const code = p.adcode ?? p.cityId;
    if (!isAdcode(code)) continue;
    lit[code] = (lit[code] ?? 0) + 1;
    for (const a of ancestryOf(code)) rollup[a] = (rollup[a] ?? 0) + 1;
  }

  return { lit, rollup };
}
