import type { PlaceColor, PlaceKind } from "@/types";

/** The only colour in the UI: marker dots, slightly desaturated. */
export const PLACE_COLOR_HEX: Record<PlaceColor, string> = {
  amber: "#d8b36a",
  rose: "#d48a95",
  violet: "#a99bd8",
  sky: "#7fb2d6",
  emerald: "#7cc0a2",
  fuchsia: "#c696cf",
};

/** New places get their colour from their trip kind. */
export const KIND_COLOR: Record<PlaceKind, PlaceColor> = {
  travel: "amber",
  business: "sky",
  study: "violet",
  home: "rose",
  transit: "emerald",
  other: "fuchsia",
};

export const PLACE_KIND_LABEL: Record<PlaceKind, string> = {
  travel: "旅行",
  business: "出差",
  study: "学习",
  home: "探亲",
  transit: "中转",
  other: "其他",
};

export function colorHex(color?: string): string {
  return PLACE_COLOR_HEX[color as PlaceColor] ?? PLACE_COLOR_HEX.amber;
}
