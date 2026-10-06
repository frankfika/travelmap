import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CornerDownLeft, Download, Globe2, Map as MapIcon, MapPin, Moon, Plus, Settings, Trash2 } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { addFromText, summarize } from "@/lib/aiParser";
import { clearPhotos } from "@/lib/photoStore";
import { cn, exportPlaces } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void | Promise<unknown>;
}

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const setOpen = useStore((s) => s.setPaletteOpen);
  const places = useStore((s) => s.places);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const { setYear, selectPlace, toggleTheme, clearAll, notify } = useStore.getState();
    const years = [...new Set(places.map((p) => p.visitedStart.slice(0, 4)))].sort().reverse();
    const q = query.trim();
    const list: Command[] = [];

    if (q) {
      list.push({
        id: "add",
        label: `添加旅行：${q}`,
        icon: Plus,
        run: async () => {
          const { added } = await addFromText(q);
          if (!added.length) notify(`没认出「${q}」里的城市`);
          else if (!location.hash.match(/world|china/)) navigate("/world");
        },
      });
    }
    for (const y of years) {
      list.push({
        id: `year-${y}`,
        label: `查看 ${y} 年的旅行`,
        hint: `${places.filter((p) => p.visitedStart.startsWith(y)).length} 次`,
        icon: CalendarDays,
        run: () => {
          setYear(y);
          if (!location.hash.match(/world|china/)) navigate("/world");
        },
      });
    }
    list.push(
      { id: "world", label: "世界地图", icon: Globe2, run: () => navigate("/world") },
      { id: "china", label: "中国地图", icon: MapIcon, run: () => navigate("/china") },
      { id: "settings", label: "设置", icon: Settings, run: () => navigate("/settings") },
      { id: "theme", label: "切换明暗主题", icon: Moon, run: toggleTheme },
      { id: "export", label: "导出所有数据", hint: "JSON", icon: Download, run: () => exportPlaces(places) },
      {
        id: "clear",
        label: "清空数据",
        icon: Trash2,
        run: async () => {
          if (!confirm("清空所有地点、笔记和照片？此操作无法撤销。")) return;
          await clearPhotos();
          clearAll();
          notify("已清空");
        },
      }
    );
    for (const p of places) {
      list.push({
        id: `place-${p.id}`,
        label: p.name,
        hint: p.visitedStart.slice(0, 7).replace("-", "."),
        icon: MapPin,
        run: () => {
          navigate(p.countryCode === "CN" && location.hash.includes("china") ? "/china" : "/world");
          selectPlace(p.id);
        },
      });
    }

    if (!q) return list.filter((c) => !c.id.startsWith("place-")).slice(0, 12);
    const lower = q.toLowerCase();
    return [list[0], ...list.slice(1).filter((c) => c.label.toLowerCase().includes(lower))].slice(0, 12);
  }, [places, query, navigate]);

  const run = async (c: Command | undefined) => {
    if (!c) return;
    setOpen(false);
    await c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = commands.length;
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(commands[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/40 px-4 pt-[18vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onMouseDown={() => setOpen(false)}
        >
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] overflow-hidden rounded-lg border border-line bg-card shadow-float"
            role="dialog"
            aria-label="命令面板"
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="输入命令，或描述一次旅行…"
              className="w-full border-b border-line bg-transparent px-6 py-4 text-[15px] text-fg outline-none placeholder:text-muted"
            />

            {!query && (
              <p className="border-b border-line px-6 py-4 text-[13px] leading-relaxed text-muted">{summarize(places)}</p>
            )}

            <ul className="thin-scrollbar max-h-[46vh] overflow-y-auto py-2">
              {commands.map((c, i) => (
                <li key={c.id}>
                  <button
                    onClick={() => run(c)}
                    onMouseMove={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center gap-3 px-6 py-2 text-left text-[14px]",
                      i === active ? "bg-fg/[0.06] text-fg" : "text-fg/80"
                    )}
                  >
                    <c.icon className="h-4 w-4 shrink-0 text-muted" />
                    <span className="flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="text-xs text-muted">{c.hint}</span>}
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
