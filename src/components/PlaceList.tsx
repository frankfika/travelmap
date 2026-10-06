import { useState } from "react";
import type { Place } from "@/types";
import { useStore } from "@/hooks/useStore";
import { colorHex } from "@/lib/colors";
import { cn } from "@/lib/utils";

const COLLAPSED = 3;

export function PlaceList({ places }: { places: Place[] }) {
  const selectedId = useStore((s) => s.selectedId);
  const selectPlace = useStore((s) => s.selectPlace);
  const [expanded, setExpanded] = useState(false);

  const sorted = [...places].sort((a, b) => b.visitedStart.localeCompare(a.visitedStart) || b.createdAt - a.createdAt);
  const shown = expanded ? sorted : sorted.slice(0, COLLAPSED);

  return (
    <div className="surface w-64 py-2">
      <div className="flex items-center justify-between px-4 pb-1 text-xs text-muted">
        <span>最近</span>
        {sorted.length > COLLAPSED && (
          <button onClick={() => setExpanded((v) => !v)} className="hover:text-fg">
            {expanded ? "收起" : `全部 ${sorted.length}`}
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="px-4 py-2 text-[13px] text-muted">还没有足迹，从右下角开始。</p>
      ) : (
        <ul className={cn(expanded && "thin-scrollbar max-h-[45vh] overflow-y-auto")}>
          {shown.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => selectPlace(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-1.5 text-left text-[13px] transition-colors hover:bg-fg/[0.04]",
                  p.id === selectedId ? "bg-fg/[0.06] text-fg" : "text-fg/90"
                )}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colorHex(p.color) }} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs tabular-nums text-muted">{p.visitedStart.slice(0, 7).replace("-", ".")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
