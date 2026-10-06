import { useMemo, useRef, useState, useEffect } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { addFromText, hasClaude, parseLocal } from "@/lib/aiParser";
import { useCitySearch } from "@/hooks/useCitySearch";
import { CHINA_CITIES } from "@/data/china";
import { countryName } from "@/data/cities";
import { PLACE_KIND_LABEL } from "@/lib/colors";
import { formatDateRange, cn } from "@/lib/utils";

const ZH_NAMES = CHINA_CITIES.map((c) => c.name.replace(/(市|地区)$/, ""));

/** Trailing word the user is still typing, for completion. */
function trailingToken(text: string): string {
  const m = text.match(/([A-Za-z][A-Za-z'.-]*(?: [A-Za-z][A-Za-z'.-]*)?|[一-鿿]{1,3})$/);
  return m?.[1] ?? "";
}

export function FloatingInput({ onAdded, className }: { onAdded?: () => void; className?: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the input from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(el.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const preview = useMemo(() => (text.trim() ? parseLocal(text) : null), [text]);

  const token = trailingToken(text);
  const isZh = /[一-鿿]/.test(token);
  const { results } = useCitySearch(isZh ? "" : token);
  const suggestions = useMemo(() => {
    if (!token) return [];
    if (isZh) {
      // Try the longest suffix that prefixes a city name; skip if it's already complete
      for (let k = token.length; k >= 1; k--) {
        const s = token.slice(-k);
        if (ZH_NAMES.includes(s)) return [];
        const hits = ZH_NAMES.filter((n) => n.startsWith(s)).slice(0, 4);
        if (hits.length) return hits.map((n) => ({ label: n, hint: "中国", replace: s }));
      }
      return [];
    }
    if (token.length < 3) return [];
    if (results.some((c) => c.n.toLowerCase() === token.toLowerCase())) return [];
    return results.slice(0, 4).map((c) => ({ label: c.n, hint: countryName(c.p), replace: token }));
  }, [token, isZh, results]);

  const accept = (i: number) => {
    const s = suggestions[i];
    if (!s) return;
    setText(text.slice(0, text.length - s.replace.length) + s.label);
    setActive(0);
    inputRef.current?.focus();
  };

  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    const { added, missed } = await addFromText(value);
    setBusy(false);
    if (!added.length) {
      setError(missed.length ? `没找到「${missed.join("、")}」，试试英文名或拼音` : "没认出城市，试试「成都，2024 年春天」");
      return;
    }
    if (missed.length) setError(`已跳过「${missed.join("、")}」`);
    setText("");
    onAdded?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (suggestions.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
    } else if (suggestions.length && e.key === "Tab") {
      e.preventDefault();
      accept(active);
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn("w-[min(400px,calc(100vw-32px))]", className)}>
      {suggestions.length > 0 && (
        <ul className="surface mb-2 overflow-hidden py-1">
          {suggestions.map((s, i) => (
            <li key={s.label + s.hint}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => accept(i)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-1.5 text-left text-[13px]",
                  i === active ? "bg-fg/[0.06] text-fg" : "text-muted"
                )}
              >
                {s.label}
                <span className="text-xs text-muted">{s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-line bg-card shadow-float">
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-1">
          <Sparkles className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="描述你的旅行…"
            aria-label="描述你的旅行"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted"
            disabled={busy}
          />
          <button
            onClick={submit}
            disabled={!text.trim() || busy}
            aria-label="记录"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-accent-fg transition-opacity disabled:opacity-20"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.25} />}
          </button>
        </div>
        <div className="truncate px-4 pb-3 pl-11 text-xs text-muted">
          {error ? (
            <span className="text-fg/80">{error}</span>
          ) : preview && preview.cities.length ? (
            <>
              {preview.cities.map((c) => c.name).join("、")}
              <span className="mx-1.5 opacity-40">·</span>
              {formatDateRange(preview.dateStart, preview.dateEnd)}
              <span className="mx-1.5 opacity-40">·</span>
              {PLACE_KIND_LABEL[preview.kind]}
            </>
          ) : (
            <>例如：成都，2024 年春天{hasClaude && <span className="ml-2 opacity-60">· Claude</span>}</>
          )}
        </div>
      </div>
    </div>
  );
}
