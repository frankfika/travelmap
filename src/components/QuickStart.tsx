import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { CHINA_PROVINCES, shortProvince } from "@/data/china";
import { useStore } from "@/hooks/useStore";
import { cn } from "@/lib/utils";

const TODAY = () => new Date().toISOString().slice(0, 10);

export const ONBOARDED_KEY = "tt-onboarded:v1";

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * First-run grid: pick the provinces you've been to and the whole map lights up
 * in one go. This exists because the old empty state ("还没有足迹") gave a new
 * user nothing to look at and nothing to do.
 */
export function QuickStart({ onDone }: { onDone: () => void }) {
  const addPlaces = useStore((s) => s.addPlaces);
  const notify = useStore((s) => s.notify);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const total = CHINA_PROVINCES.length;
  const count = picked.size;
  const pct = Math.round((count / total) * 100);

  const toggle = (code: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const finish = (save: boolean) => {
    if (save && count > 0) {
      const today = TODAY();
      addPlaces(
        CHINA_PROVINCES.filter((p) => picked.has(p.code)).map((p) => ({
          name: p.name,
          cityId: p.code,
          adcode: p.code,
          level: "province" as const,
          country: "中国",
          countryCode: "CN",
          lat: p.center[0],
          lng: p.center[1],
          visitedStart: today,
          visitedEnd: today,
          kind: "travel" as const,
          note: "",
          photoIds: [],
          color: "amber" as const,
          chinaRegion: { province: p.name, provinceCode: p.code },
        }))
      );
      notify(`已点亮 ${count} 个省级行政区`);
    }
    markOnboarded();
    onDone();
  };

  const hint = useMemo(() => {
    if (count === 0) return "点一下你去过的省份，整片区域会立刻亮起来";
    if (count < 5) return "不错，继续点";
    if (count < 15) return "已经走过不少地方了";
    if (count < 30) return "旅行家级别";
    return "几乎走遍全国";
  }, [count]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1500] grid place-items-center bg-bg/85 px-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="surface w-[min(600px,100%)] p-7"
      >
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles className="h-3.5 w-3.5" />
          30 秒点亮你的地图
        </div>
        <h2 className="mt-2 text-[22px] font-medium tracking-tight">你去过哪些省？</h2>
        <p className="mt-1 text-[13px] text-muted">{hint}</p>

        <div className="mt-5 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {CHINA_PROVINCES.map((p) => {
            const on = picked.has(p.code);
            return (
              <button
                key={p.code}
                onClick={() => toggle(p.code)}
                className={cn(
                  "relative rounded-md border px-1 py-2 text-xs transition-all duration-150",
                  on
                    ? "border-transparent bg-[#e0b566] text-black"
                    : "border-line text-fg/80 hover:border-fg/30 hover:bg-fg/[0.04]"
                )}
              >
                {shortProvince(p.name)}
                {on && (
                  <Check className="absolute right-1 top-1 h-2.5 w-2.5" strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => finish(false)}
            className="text-[13px] text-muted transition-colors hover:text-fg"
          >
            跳过，以后再说
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-muted">
              {count}/{total}
              {count > 0 && <span className="ml-1.5 text-fg/70">{pct}%</span>}
            </span>
            <button
              onClick={() => finish(true)}
              disabled={count === 0}
              className={cn(
                "rounded-md px-4 py-2 text-[13px] font-medium transition-all",
                count > 0
                  ? "bg-fg text-bg hover:opacity-90"
                  : "cursor-not-allowed bg-fg/10 text-muted"
              )}
            >
              点亮这 {count} 个
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
