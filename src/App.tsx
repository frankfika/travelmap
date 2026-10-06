import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar } from "@/components/TopBar";
import { CommandPalette } from "@/components/CommandPalette";
import { AchievementWatcher } from "@/components/AchievementWall";
import { useStore } from "@/hooks/useStore";
import { warmBoundaryCache } from "@/lib/boundaries";
import { warmWorldCache } from "@/lib/worldBoundaries";
import { migrateLegacyBoundaryCache } from "@/lib/boundaryStore";
import Home from "@/pages/Home";
import MapPage from "@/pages/MapPage";
import Settings from "@/pages/Settings";
import SharedMap from "@/pages/SharedMap";

function Toast() {
  const toast = useStore((s) => s.toast);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed top-24 left-1/2 z-[2100] -translate-x-1/2 rounded-lg border border-line bg-card px-4 py-2 text-[13px] text-fg"
          role="status"
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const theme = useStore((s) => s.theme);

  // Move any outlines left in localStorage into IndexedDB, then warm the
  // in-memory cache so region lookups stay synchronous for the rest of the session.
  useEffect(() => {
    (async () => {
      await migrateLegacyBoundaryCache();
      await Promise.all([warmBoundaryCache(), warmWorldCache()]);
    })();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0a0a0f" : "#fafafa");
  }, [theme]);

  return (
    <HashRouter>
      <TopBar />
      <Routes>
        <Route path="/world" element={<MapPage key="world" mode="world" />} />
        <Route path="/china" element={<MapPage key="china" mode="china" />} />
        <Route path="/s/:token" element={<SharedMap />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <CommandPalette />
      <AchievementWatcher />
      <Toast />
    </HashRouter>
  );
}
