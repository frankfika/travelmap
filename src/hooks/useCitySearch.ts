import { useEffect, useMemo, useState } from "react";
import type { City } from "@/types";
import { defaultCities } from "@/data/cities";

const MIN_CHARS = 3;
const CACHE = new Map<string, Promise<City[]>>();

/** Load the pre-indexed GeoNames shard /cities/<first 3 chars>.json (cached). */
export function loadCityShard(query: string): Promise<City[]> {
  const prefix = query.trim().toLowerCase().slice(0, MIN_CHARS);
  if (prefix.length < MIN_CHARS) return Promise.resolve([]);
  if (!CACHE.has(prefix)) {
    CACHE.set(
      prefix,
      fetch(`./cities/${prefix}.json`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    );
  }
  return CACHE.get(prefix)!;
}

/**
 * Search the world city database.
 * - 0–2 chars → curated list of popular cities
 * - 3+ chars → GeoNames shard
 */
export function useCitySearch(query: string) {
  const trimmed = query.trim().toLowerCase();
  const [loaded, setLoaded] = useState<City[]>(defaultCities);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (trimmed.length < MIN_CHARS) {
      setLoaded(defaultCities);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadCityShard(trimmed).then((data) => {
      if (cancelled) return;
      setLoaded(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  const results = useMemo(() => {
    if (trimmed.length === 0) return loaded.slice(0, 30);
    return loaded.filter((c) => c.n.toLowerCase().startsWith(trimmed)).slice(0, 60);
  }, [loaded, trimmed]);

  return { results, loading, queryLength: trimmed.length };
}
