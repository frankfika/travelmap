import { Link, useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";
import { MapView } from "@/components/MapView";
import { FloatingInput } from "@/components/FloatingInput";
import { useStore } from "@/hooks/useStore";

export default function Home() {
  const places = useStore((s) => s.places);
  const navigate = useNavigate();
  const cities = new Set(places.map((p) => p.cityId)).size;

  return (
    <div className="fixed inset-0">
      <div className="absolute inset-0 opacity-80">
        <MapView mode="backdrop" places={places} />
      </div>
      <div className="absolute inset-0 bg-bg/50" />

      <main className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[44px] leading-tight font-medium tracking-[-0.03em] sm:text-[56px]">TravelTally</h1>
        <p className="mt-3 max-w-md text-[15px] text-muted">一句话记下去过的地方，剩下的交给地图。</p>
        <Link
          to="/world"
          className="mt-8 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg"
        >
          {cities ? `查看你的 ${cities} 座城市` : "打开地图"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </main>

      <div className="fixed right-6 bottom-6 z-20">
        <FloatingInput onAdded={() => navigate("/world")} />
      </div>
      <p className="fixed bottom-6 left-6 z-20 hidden text-xs text-muted sm:block">
        数据只保存在本机 · <kbd className="font-sans">⌘K</kbd> 命令
      </p>
    </div>
  );
}
