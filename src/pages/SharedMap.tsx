import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowRight } from "lucide-react";
import { MapView } from "@/components/MapView";
import { useStore } from "@/hooks/useStore";
import { computeRegionState } from "@/lib/regionState";
import { decodeShare, payloadToPlaces, type SharePayload } from "@/lib/share";
import { isAdcode } from "@/lib/adcode";
import { CHINA_PROVINCES } from "@/data/china";

export default function SharedMap() {
  const { token = "" } = useParams();
  const [data, setData] = useState<SharePayload | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "bad">("loading");
  const myPlaces = useStore((s) => s.places);
  const addChallenge = useStore((s) => s.addChallenge);
  const notify = useStore((s) => s.notify);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    decodeShare(token).then((parsed) => {
      if (cancelled) return;
      if (parsed) {
        setData(parsed);
        setState("ok");
      } else {
        setState("bad");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const sharedPlaces = useMemo(() => (data ? payloadToPlaces(data) : []), [data]);
  const regionState = useMemo(() => computeRegionState(sharedPlaces), [sharedPlaces]);

  /** Overlap with whatever is stored on this device. */
  const compare = useMemo(() => {
    if (!data) return null;
    const mine = new Set(
      myPlaces.map((p) => p.adcode ?? p.cityId).filter((c) => isAdcode(c))
    );
    if (!mine.size) return null;
    const theirs = new Set(data.c);
    const both = [...theirs].filter((c) => mine.has(c)).length;
    const onlyMine = [...mine].filter((c) => !theirs.has(c)).length;
    const onlyTheirs = [...theirs].filter((c) => !mine.has(c)).length;
    const union = both + onlyMine + onlyTheirs;
    return {
      both,
      onlyMine,
      onlyTheirs,
      overlapPct: union ? Math.round((both / union) * 100) : 0,
    };
  }, [data, myPlaces]);

  /** Their regions minus mine = the challenge. Computed locally; nothing is sent back. */
  const onAcceptChallenge = () => {
    if (!data) return;
    const mine = new Set(
      myPlaces.map((p) => p.adcode ?? p.cityId).filter((c) => isAdcode(c))
    );
    const targets = data.c.filter((c) => !mine.has(c));
    if (!targets.length) {
      notify("你们去的地方完全重合，没有可挑战的");
      return;
    }
    addChallenge({ from: data.n || "朋友", targets });
    notify(`已收下挑战 · ${targets.length} 个地方待点亮`);
    navigate("/china");
  };

  const provinceCount = useMemo(() => {
    if (!data) return 0;
    const provinces = new Set(data.c.map((c) => c.slice(0, 2) + "0000"));
    return CHINA_PROVINCES.filter((p) => provinces.has(p.code)).length;
  }, [data]);

  if (state === "loading") {
    return (
      <div className="grid h-[calc(100vh-3.5rem)] place-items-center text-[13px] text-muted">
        正在打开…
      </div>
    );
  }

  if (state === "bad") {
    return (
      <div className="grid h-[calc(100vh-3.5rem)] place-items-center px-6 text-center">
        <div>
          <p className="text-[15px]">这个分享链接无法读取</p>
          <p className="mt-1 text-[13px] text-muted">链接可能不完整，或者被聊天软件截断了。</p>
          <Link to="/" className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
            打开 TravelTally <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-14">
      {/* Read-only: nothing here is written to this device's store. */}
      <MapView mode="china" places={sharedPlaces} regionState={regionState} />

      <div className="surface pointer-events-auto fixed top-20 left-1/2 z-[1000] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 px-5 py-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e0b566]" />
          只读分享
        </div>
        <h1 className="mt-1.5 text-[17px] font-medium tracking-tight">
          {data?.n ? `${data.n} 的足迹` : "TA 的足迹"}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {sharedPlaces.length} 个地点 · {provinceCount} 个省级行政区
          {data?.w.length ? ` · ${data.w.length} 个国外城市` : ""}
        </p>

        {compare && (
          <div className="mt-3 border-t border-line pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-medium tabular-nums">{compare.overlapPct}%</span>
              <span className="text-[12px] text-muted">重合度</span>
            </div>
            <p className="mt-1 text-[12px] text-muted">
              共同去过 {compare.both} 个地方
              {compare.onlyMine > 0 && ` · 你去过 TA 没去的 ${compare.onlyMine} 个`}
              {compare.onlyTheirs > 0 && ` · TA 去过你没去的 ${compare.onlyTheirs} 个`}
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-[12px] text-muted">笔记和照片没有包含在链接里</span>
          <div className="flex items-center gap-2">
            {compare && compare.onlyTheirs > 0 && (
              <button
                onClick={onAcceptChallenge}
                className="rounded-md bg-fg px-3 py-1.5 text-[12px] font-medium text-bg transition-opacity hover:opacity-90"
              >
                收下挑战 · {compare.onlyTheirs} 个
              </button>
            )}
            <Link to="/world" className="inline-flex items-center gap-1 text-[12px] text-fg/80 hover:text-fg">
              创建我的地图 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
