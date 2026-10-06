import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { MapView, type RegionHit } from "@/components/MapView";
import { FloatingInput } from "@/components/FloatingInput";
import { PlaceList } from "@/components/PlaceList";
import { PlaceDrawer } from "@/components/PlaceDrawer";
import { useStore, useVisiblePlaces } from "@/hooks/useStore";
import { QuickStart, hasOnboarded } from "@/components/QuickStart";
import { CHINA_PROVINCES, provinceByCode, shortProvince } from "@/data/china";
import { COUNTRY_ADCODE } from "@/lib/boundaries";
import { ancestryOf, provinceCodeOf } from "@/lib/adcode";
import { computeRegionState } from "@/lib/regionState";
import {
  allCachedBoundaries,
  boundaryKey,
  lookupBoundary,
  peekBoundary,
  type WorldBoundary,
} from "@/lib/worldBoundaries";
import { KIND_COLOR } from "@/lib/colors";
import { cn } from "@/lib/utils";

interface Crumb {
  adcode: string;
  name: string;
}

const ROOT: Crumb = { adcode: COUNTRY_ADCODE, name: "全国" };
const today = () => new Date().toISOString().slice(0, 10);

export default function MapPage({ mode }: { mode: "world" | "china" }) {
  const visible = useVisiblePlaces();
  /** Unfiltered — "does a record for this region already exist?" must ignore the year filter. */
  const allPlaces = useStore((s) => s.places);
  const places = useMemo(
    () => (mode === "china" ? visible.filter((p) => p.countryCode === "CN") : visible),
    [visible, mode]
  );
  const selectedId = useStore((s) => s.selectedId);
  const selectPlace = useStore((s) => s.selectPlace);
  const addPlace = useStore((s) => s.addPlace);
  const updatePlace = useStore((s) => s.updatePlace);
  const notify = useStore((s) => s.notify);
  const challenges = useStore((s) => s.challenges);
  const removeChallenge = useStore((s) => s.removeChallenge);
  const selected = places.find((p) => p.id === selectedId);

  /** First-run nudge: nothing to look at yet, so offer the 30-second grid. */
  const [quickStart, setQuickStart] = useState(() => !hasOnboarded());

  /** Where we are inside China: 全国 → 浙江省 → 杭州市. */
  const [path, setPath] = useState<Crumb[]>([ROOT]);
  const current = path[path.length - 1];

  /** Resolved city outlines outside China, painted the same way as adcodes. */
  const [worldBounds, setWorldBounds] = useState<WorldBoundary[]>([]);
  const [lookupsLeft, setLookupsLeft] = useState(0);
  /**
   * Places whose outline we already resolved in this session. Marked *after*
   * the lookup succeeds — StrictMode runs effects twice, and marking up front
   * would let the second pass skip a place the first pass never finished.
   * Concurrent lookups for the same city are de-duplicated inside the loader.
   */
  const resolved = useRef(new Set<string>());

  /** Outline keys the currently visible places actually want drawn. */
  const wantedKeys = useMemo(
    () => new Set(places.map((p) => p.boundaryKey).filter(Boolean) as string[]),
    [places]
  );

  useEffect(() => {
    if (mode !== "world") return;

    // Draw exactly what the visible places reference — not every outline we have
    // ever cached. Otherwise deleting a place leaves its shape painted on.
    setWorldBounds((prev) => {
      const keep = prev.filter((b) => wantedKeys.has(b.key));
      const missing = [...wantedKeys].filter((k) => !keep.some((b) => b.key === k));
      if (!missing.length) return keep.length === prev.length ? prev : keep;
      const fromCache = allCachedBoundaries().filter((b) => missing.includes(b.key));
      if (!fromCache.length) return keep.length === prev.length ? prev : keep;
      return [...keep, ...fromCache];
    });

    // Re-fetch when the outline is missing or its cache expired, so a place
    // never silently disappears from the map.
    const todo = places.filter(
      (p) =>
        p.countryCode !== "CN" &&
        !(p.boundaryKey && peekBoundary(p.boundaryKey)) &&
        !resolved.current.has(p.id)
    );
    if (!todo.length) return;

    let cancelled = false;
    setLookupsLeft(todo.length);

    (async () => {
      for (const p of todo) {
        // The cache is keyed by Latin name (`lookupName`) — Chinese/Japanese
        // aliases (东京→Tokyo) keep their display name in the user's script,
        // but the static OSM bundle is keyed by Latin, so we look up under
        // the canonical name when present.
        const cacheName = p.lookupName ?? p.name;
        const found = await lookupBoundary(
          boundaryKey(cacheName, p.countryCode),
          cacheName,
          p.countryCode,
          p.lat,
          p.lng
        );
        if (cancelled) return;
        setLookupsLeft((n) => Math.max(0, n - 1));
        if (!found) continue;
        resolved.current.add(p.id);
        updatePlace(p.id, { boundaryKey: found.key });
        setWorldBounds((prev) => (prev.some((b) => b.key === found.key) ? prev : [...prev, found]));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, places, wantedKeys, updatePlace]);

  const regionState = useMemo(() => computeRegionState(places), [places]);

  /** Challenge progress: which targets are still unlit, and per-challenge counts. */
  const challengeInfo = useMemo(() => {
    if (!challenges.length) return { pending: new Set<string>(), rows: [] as { id: string; from: string; done: number; total: number }[] };
    const litNow = new Set(Object.keys(regionState.lit));
    const pending = new Set<string>();
    const rows = challenges.map((c) => {
      let done = 0;
      for (const t of c.targets) if (litNow.has(t)) done++;
      for (const t of c.targets) if (!litNow.has(t)) pending.add(t);
      return { id: c.id, from: c.from, done, total: c.targets.length };
    });
    return { pending, rows };
  }, [challenges, regionState]);

  const announced = useRef(new Set<string>());
  useEffect(() => {
    for (const row of challengeInfo.rows) {
      if (row.total > 0 && row.done >= row.total && !announced.current.has(row.id)) {
        announced.current.add(row.id);
        notify(`挑战完成 · ${row.from} 去过的地方你全点亮了`);
      }
    }
  }, [challengeInfo, notify]);

  /** Single click: light the region up, or open it if it is already lit. */
  const handleRegionToggle = (region: RegionHit) => {
    const existing = allPlaces.find((p) => (p.adcode ?? p.cityId) === region.adcode);
    if (existing) {
      selectPlace(existing.id);
      return;
    }
    const province = provinceByCode(provinceCodeOf(region.adcode) ?? "");
    addPlace({
      name: region.name,
      cityId: region.adcode,
      adcode: region.adcode,
      level: region.level,
      country: "中国",
      countryCode: "CN",
      lat: region.center[0],
      lng: region.center[1],
      visitedStart: today(),
      visitedEnd: today(),
      kind: "travel",
      note: "",
      photoIds: [],
      color: KIND_COLOR.travel,
      chinaRegion: province ? { province: province.name, provinceCode: province.code } : undefined,
    });
    notify(`已点亮 ${region.name}`);
  };

  /** Double click: descend into the region (districts have no children). */
  const handleRegionDrill = (region: RegionHit) => {
    if (region.level === "district") return;
    setPath((prev) => (prev[prev.length - 1].adcode === region.adcode ? prev : [...prev, { adcode: region.adcode, name: region.name }]));
  };

  /** Visits recorded directly in the region currently on screen. */
  const litHere = useMemo(() => {
    const here = path[path.length - 1].adcode;
    return Object.entries(regionState.lit)
      .filter(([code]) => code === here || ancestryOf(code).includes(here))
      .reduce((sum, [, v]) => sum + v, 0);
  }, [regionState, path]);

  return (
    <div className="fixed inset-0">
      <MapView
        mode={mode}
        places={places}
        drillAdcode={mode === "china" ? current.adcode : undefined}
        regionState={mode === "china" ? regionState : undefined}
        onRegionToggle={mode === "china" ? handleRegionToggle : undefined}
        onRegionDrill={mode === "china" ? handleRegionDrill : undefined}
        worldBoundaries={mode === "world" ? worldBounds : undefined}
        pending={mode === "china" ? challengeInfo.pending : undefined}
      />

      {mode === "china" && (
        <Breadcrumbs
          path={path}
          onJump={(i) => setPath((prev) => prev.slice(0, i + 1))}
          litHere={litHere}
        />
      )}

      {mode === "china" && challengeInfo.rows.length > 0 && (
        <div className="surface fixed top-14 right-4 z-[1000] flex items-center gap-2 px-2.5 py-1 text-xs">
          {challengeInfo.rows.map((r) => (
            <span key={r.id} className="flex items-center gap-1.5">
              <span className="text-muted">{r.from} 的挑战</span>
              <span className="tabular-nums">{r.done}/{r.total}</span>
              <button
                onClick={() => removeChallenge(r.id)}
                className="text-muted transition-colors hover:text-fg"
                aria-label="放弃挑战"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {mode === "world" && lookupsLeft > 0 && (
        <div className="surface fixed top-14 left-1/2 z-[1000] -translate-x-1/2 px-2.5 py-1 text-xs text-muted">
          正在获取 {lookupsLeft} 个城市的边界…
        </div>
      )}

      {mode === "china" && path.length === 1 && (
        <ProvinceNav counts={regionState.rollup} onPick={(c) => setPath([ROOT, { adcode: c.code, name: c.name }])} />
      )}

      <div className="fixed bottom-6 left-6 z-[1000] hidden sm:block">
        <PlaceList places={places} />
      </div>

      {/* Slides left of the drawer while it's open */}
      <div
        className={cn(
          "fixed bottom-6 z-[1000] transition-[right,opacity] duration-300",
          selected ? "right-[392px] max-sm:opacity-0" : "right-6"
        )}
      >
        <FloatingInput />
      </div>

      <AnimatePresence>{selected && <PlaceDrawer key={selected.id} place={selected} />}</AnimatePresence>

      <AnimatePresence>
        {quickStart && places.length === 0 && (
          <QuickStart key="quickstart" onDone={() => setQuickStart(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Breadcrumbs({
  path,
  onJump,
  litHere,
}: {
  path: Crumb[];
  onJump: (index: number) => void;
  litHere: number;
}) {
  const atRoot = path.length === 1;
  return (
    <nav className="surface fixed top-14 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-1 px-2 py-1 text-xs">
      {path.map((c, i) => (
        <Fragment key={c.adcode}>
          {i > 0 && <span className="text-muted/40">›</span>}
          <button
            onClick={() => onJump(i)}
            disabled={i === path.length - 1}
            className={cn(
              "rounded-md px-1.5 py-0.5 transition-colors",
              i === path.length - 1 ? "text-fg" : "text-muted hover:bg-fg/5 hover:text-fg"
            )}
          >
            {c.name}
          </button>
        </Fragment>
      ))}
      <span className="ml-1 hidden text-[11px] text-muted/60 sm:inline">
        {litHere > 0 && <span className="mr-1.5 text-fg/70">{litHere} 次</span>}
        {atRoot ? "单击点亮省份 · 双击进入" : "单击点亮 · 双击进入"}
      </span>
    </nav>
  );
}

function ProvinceNav({ counts, onPick }: { counts: Record<string, number>; onPick: (p: (typeof CHINA_PROVINCES)[number]) => void }) {
  return (
    <div data-province-nav className="surface no-scrollbar fixed top-[104px] left-1/2 z-[1000] flex max-w-[min(760px,calc(100vw-32px))] -translate-x-1/2 items-center gap-0.5 overflow-x-auto p-1 text-xs">
      {CHINA_PROVINCES.map((p) => {
        const n = counts[p.code] ?? 0;
        return (
          <button
            key={p.code}
            onClick={() => onPick(p)}
            className={cn(
              "shrink-0 rounded-md px-2 py-0.5 transition-colors",
              n > 0 ? "text-fg hover:bg-fg/5" : "text-muted/70 hover:text-fg"
            )}
          >
            {shortProvince(p.name)}
            {n > 0 && <sup className="ml-0.5 text-[9px] text-muted">{n}</sup>}
          </button>
        );
      })}
    </div>
  );
}
