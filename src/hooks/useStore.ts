import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Challenge, Place } from "@/types";
import { uid } from "@/lib/utils";
import { isAdcode, levelOf } from "@/lib/adcode";

type Theme = "dark" | "light";

/**
 * Every China record should carry the adcode it lights up, whichever entry
 * point created it. Older rows only have `cityId`, which is already an adcode
 * for anything added through the city picker.
 */
function withRegion(p: Omit<Place, "id" | "createdAt">): Omit<Place, "id" | "createdAt"> {
  if (p.adcode || p.countryCode !== "CN" || !isAdcode(p.cityId)) return p;
  return { ...p, adcode: p.cityId, level: levelOf(p.cityId) };
}

interface StoreState {
  places: Place[];
  /** Accepted challenges from share links. */
  challenges: Challenge[];
  /** id of the place open in the drawer, or null */
  selectedId: string | null;
  /** Only show visits from this year (set from the command palette) */
  year: string | null;
  theme: Theme;
  toast: string | null;
  paletteOpen: boolean;
  addPlace: (p: Omit<Place, "id" | "createdAt"> & { id?: string }) => string;
  /** Bulk add, used by the quick-start grid — one render instead of N. */
  addPlaces: (list: Omit<Place, "id" | "createdAt">[]) => number;
  updatePlace: (id: string, patch: Partial<Place>) => void;
  removePlace: (id: string) => void;
  selectPlace: (id: string | null) => void;
  importPlaces: (places: Place[]) => void;
  addChallenge: (c: Omit<Challenge, "id" | "createdAt">) => void;
  removeChallenge: (id: string) => void;
  clearAll: () => void;
  setYear: (year: string | null) => void;
  toggleTheme: () => void;
  notify: (msg: string) => void;
  setPaletteOpen: (open: boolean) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      places: [],
      challenges: [],
      selectedId: null,
      year: null,
      theme: "dark",
      toast: null,
      paletteOpen: false,

      addPlace: (p) => {
        const id = p.id ?? uid();
        set((state) => ({
          places: [{ ...withRegion(p), id, createdAt: Date.now() } as Place, ...state.places],
        }));
        return id;
      },

      addPlaces: (list) => {
        const now = Date.now();
        const rows = list.map((p, i) => ({
          ...withRegion(p),
          id: uid(),
          createdAt: now + i,
        })) as Place[];
        set((state) => ({ places: [...rows, ...state.places] }));
        return rows.length;
      },

      updatePlace: (id, patch) =>
        set((state) => ({
          places: state.places.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      removePlace: (id) =>
        set((state) => ({
          places: state.places.filter((x) => x.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        })),

      selectPlace: (id) => set({ selectedId: id }),

      importPlaces: (places) =>
        set(() => ({
          places: [...places].sort((a, b) => b.createdAt - a.createdAt),
          selectedId: null,
        })),

      addChallenge: (c) =>
        set((state) => ({
          challenges: [
            { ...c, id: uid(), createdAt: Date.now() },
            ...state.challenges.filter((x) => x.from !== c.from),
          ],
        })),

      removeChallenge: (id) =>
        set((state) => ({ challenges: state.challenges.filter((c) => c.id !== id) })),

      clearAll: () => set({ places: [], challenges: [], selectedId: null, year: null }),

      setYear: (year) => set({ year }),

      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

      notify: (msg) => {
        clearTimeout(toastTimer);
        set({ toast: msg });
        toastTimer = setTimeout(() => set({ toast: null }), 2600);
      },

      setPaletteOpen: (open) => set({ paletteOpen: open }),
    }),
    {
      name: "traveltally-state",
      version: 2,
      /**
       * v1 stored only `cityId`. When it happens to be an adcode we can promote
       * the row to a region record so it paints the area instead of a dot.
       */
      migrate: (persisted, version) => {
        const state = persisted as { places?: Omit<Place, "id" | "createdAt">[] } | undefined;
        if (version < 2 && state?.places) {
          state.places = state.places.map((p) => withRegion(p));
        }
        return state as never;
      },
      partialize: (s) => ({ places: s.places, challenges: s.challenges, theme: s.theme }),
    }
  )
);

/** Places after the palette's year filter. Memoised: a fresh array each render
 *  would invalidate every downstream effect that depends on it. */
export function useVisiblePlaces() {
  const places = useStore((s) => s.places);
  const year = useStore((s) => s.year);
  return useMemo(
    () => (year ? places.filter((p) => p.visitedStart.startsWith(year)) : places),
    [places, year]
  );
}
