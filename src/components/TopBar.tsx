import { Link, NavLink, useLocation } from "react-router";
import { Moon, Sun, X } from "lucide-react";
import { useStore, useVisiblePlaces } from "@/hooks/useStore";
import { CHINA_PROVINCES } from "@/data/china";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/world", label: "世界" },
  { to: "/china", label: "中国" },
  { to: "/settings", label: "设置" },
];

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="3.5" fill="currentColor" />
    </svg>
  );
}

function Stats() {
  const { pathname } = useLocation();
  const places = useVisiblePlaces();
  const year = useStore((s) => s.year);
  const setYear = useStore((s) => s.setYear);
  if (pathname !== "/world" && pathname !== "/china") return null;

  let text: string;
  if (pathname === "/china") {
    const cn = places.filter((p) => p.countryCode === "CN");
    const provinces = new Set(cn.map((p) => p.chinaRegion?.provinceCode).filter(Boolean)).size;
    text = `${provinces} / ${CHINA_PROVINCES.length} 省 · ${new Set(cn.map((p) => p.cityId)).size} 城市`;
  } else {
    const cities = new Set(places.map((p) => p.cityId)).size;
    const countries = new Set(places.map((p) => p.countryCode).filter(Boolean)).size;
    text = `${cities} 座城市 · ${countries} 个国家`;
  }

  return (
    <span className="hidden items-center gap-2 text-[13px] text-muted tabular-nums md:flex">
      <span className="text-line select-none">/</span>
      {text}
      {year && (
        <button
          onClick={() => setYear(null)}
          className="ml-1 inline-flex items-center gap-1 rounded-md border border-line px-1.5 text-xs text-fg hover:bg-fg/5"
        >
          {year}
          <X className="h-3 w-3 text-muted" />
        </button>
      )}
    </span>
  );
}

export function TopBar() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setPaletteOpen = useStore((s) => s.setPaletteOpen);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[1200] flex h-14 items-center justify-between px-6">
      <div className="pointer-events-auto flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 font-medium tracking-tight text-fg">
          <Logo />
          TravelTally
        </Link>
        <Stats />
      </div>

      <nav className="pointer-events-auto flex items-center gap-1 text-[13px]">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              cn("rounded-md px-3 py-1 transition-colors", isActive ? "text-fg" : "text-muted hover:text-fg")
            }
          >
            {n.label}
          </NavLink>
        ))}
        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-2 hidden items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-muted transition-colors hover:text-fg sm:flex"
          aria-label="打开命令面板"
        >
          <kbd className="font-sans">⌘K</kbd>
        </button>
        <button
          onClick={toggleTheme}
          className="ml-1 grid h-7 w-7 place-items-center rounded-md text-muted transition-colors hover:text-fg"
          aria-label="切换主题"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </nav>
    </header>
  );
}
