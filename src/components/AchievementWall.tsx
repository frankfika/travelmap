import { useEffect, useMemo, useRef } from "react";
import { ACHIEVEMENTS, computeStats, unlocked } from "@/lib/achievements";
import { useStore } from "@/hooks/useStore";
import { cn } from "@/lib/utils";

/** Badge wall for the settings page. */
export function AchievementWall() {
  const places = useStore((s) => s.places);
  const stats = useMemo(() => computeStats(places), [places]);
  const earned = ACHIEVEMENTS.filter((a) => unlocked(a, stats));
  const pct = Math.round((earned.length / ACHIEVEMENTS.length) * 100);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] text-muted">成就</h2>
        <span className="text-xs tabular-nums text-muted">
          {earned.length}/{ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-fg/10">
        <div
          className="h-full rounded-full bg-[#e0b566] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const on = unlocked(a, stats);
          const { have, need } = a.measure(stats);
          return (
            <div
              key={a.id}
              className={cn(
                "rounded-lg border px-3 py-2.5 transition-colors",
                on ? "border-[#e0b566]/40 bg-[#e0b566]/[0.07]" : "border-line"
              )}
            >
              <div className={cn("text-[13px] font-medium", on ? "text-fg" : "text-muted")}>
                {a.name}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted">{a.desc}</div>
              {!on && (
                <div className="mt-1.5 text-[10px] tabular-nums text-muted/70">
                  {have}/{need}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Announces newly unlocked achievements. Skips the first pass so a page refresh
 * doesn't replay every badge you already own.
 */
export function AchievementWatcher() {
  const places = useStore((s) => s.places);
  const notify = useStore((s) => s.notify);
  const stats = useMemo(() => computeStats(places), [places]);
  const previous = useRef<Set<string> | null>(null);

  useEffect(() => {
    const now = new Set(ACHIEVEMENTS.filter((a) => unlocked(a, stats)).map((a) => a.id));
    if (previous.current) {
      const fresh = [...now].filter((id) => !previous.current!.has(id));
      if (fresh.length) {
        const names = fresh
          .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name)
          .filter(Boolean);
        notify(`解锁成就 · ${names.join("、")}`);
      }
    }
    previous.current = now;
  }, [stats, notify]);

  return null;
}
