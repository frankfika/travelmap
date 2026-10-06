import type { AdminLevel } from "@/types";

/**
 * Mainland China's administrative division codes (adcode) are 6 digits:
 *   province  330000   (last 4 digits zero)
 *   city      330100   (last 2 digits zero)
 *   district  330106   (no trailing zeros)
 */
export function isAdcode(code: string | undefined): boolean {
  if (!code || !/^\d{6}$/.test(code)) return false;
  // Provinces run 11xxxx (Beijing) through 82xxxx (Macau).
  const prefix = Number(code.slice(0, 2));
  return prefix >= 11 && prefix <= 82;
}

/** Granularity implied by the code's shape. */
export function levelOf(code: string): AdminLevel {
  const s = String(code);
  if (!isAdcode(s)) return "city";
  if (s.endsWith("0000")) return "province";
  if (s.endsWith("00")) return "city";
  return "district";
}

/** Ancestors of an adcode, nearest first (district → city → province). */
export function ancestorsOf(code: string): string[] {
  const s = String(code);
  if (!isAdcode(s)) return [];
  const province = s.slice(0, 2) + "0000";
  const city = s.slice(0, 4) + "00";
  const out: string[] = [];
  if (levelOf(s) === "district") out.push(city);
  if (province !== city) out.push(province);
  return out;
}

/** The code itself plus every ancestor — what a visit lights up. */
export function ancestryOf(code: string): string[] {
  const s = String(code);
  if (!isAdcode(s)) return [];
  return [s, ...ancestorsOf(s)];
}

/** Province code that owns an adcode (any level). */
export function provinceCodeOf(code: string): string | null {
  return isAdcode(code) ? code.slice(0, 2) + "0000" : null;
}
