import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Place } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "2024-03-15" → "2024.03.15"; ranges collapse the shared year. */
export function formatDateRange(start: string, end: string): string {
  if (!start) return "";
  const s = start.replaceAll("-", ".");
  if (!end || end === start) return s;
  const e = end.replaceAll("-", ".");
  return `${s} – ${e.slice(0, 4) === s.slice(0, 4) ? e.slice(5) : e}`;
}

export function uid(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function exportPlaces(places: Place[]) {
  const blob = new Blob(
    [JSON.stringify({ app: "TravelTally", version: 1, exportedAt: new Date().toISOString(), places }, null, 2)],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `traveltally-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
