import type { Place } from "@/types";
import { CHINA_PROVINCES } from "@/data/china";
import { isAdcode, levelOf } from "@/lib/adcode";

/**
 * Achievements are pure set arithmetic over the places the user already has —
 * no backend, no extra storage. They exist to give the map a sense of progress:
 * before this, place #1 and place #50 felt exactly the same.
 */

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** Current / target, so locked badges can show how close you are. */
  measure: (s: Stats) => { have: number; need: number };
}

export interface Stats {
  /** Distinct lit regions of any level (adcodes). */
  regions: number;
  /** Distinct cities (adcode level city/district collapsed to their city). */
  cities: number;
  /** Distinct country codes. */
  countries: number;
  /** Lit province adcodes. */
  provinces: Set<string>;
  /** Countries outside mainland China. */
  overseas: Set<string>;
  /** Rough continent buckets touched. */
  continents: Set<string>;
  /** Any record below the equator. */
  south: boolean;
  /** Share of China's land area covered, 0–100. */
  areaPct: number;
}

const COASTAL = ["210000", "120000", "130000", "370000", "320000", "310000", "330000", "350000", "440000", "450000", "460000"];
const MUNICIPALITIES = ["110000", "120000", "310000", "500000"];
const AUTONOMOUS = ["150000", "450000", "540000", "640000", "650000"];
const TOTAL_AREA = CHINA_PROVINCES.reduce((sum, p) => sum + p.area, 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first", name: "第一步", desc: "点亮第一个地方", measure: (s) => ({ have: Math.min(s.regions, 1), need: 1 }) },
  { id: "ten", name: "十城", desc: "点亮 10 个城市", measure: (s) => ({ have: Math.min(s.cities, 10), need: 10 }) },
  { id: "fifty", name: "五十城", desc: "点亮 50 个城市", measure: (s) => ({ have: Math.min(s.cities, 50), need: 50 }) },
  { id: "prov10", name: "省级探索者", desc: "走过 10 个省级行政区", measure: (s) => ({ have: Math.min(s.provinces.size, 10), need: 10 }) },
  { id: "municipalities", name: "四大直辖市", desc: "北京、天津、上海、重庆都去过", measure: (s) => ({ have: MUNICIPALITIES.filter((c) => s.provinces.has(c)).length, need: 4 }) },
  { id: "coastal", name: "沿海走廊", desc: "走遍 11 个沿海省级行政区", measure: (s) => ({ have: COASTAL.filter((c) => s.provinces.has(c)).length, need: COASTAL.length }) },
  { id: "autonomous", name: "五大自治区", desc: "内蒙古、广西、西藏、宁夏、新疆", measure: (s) => ({ have: AUTONOMOUS.filter((c) => s.provinces.has(c)).length, need: AUTONOMOUS.length }) },
  { id: "tenth", name: "国土 10%", desc: "走过的面积占中国 10%", measure: (s) => ({ have: Math.floor(s.areaPct * 10), need: 100 }) },
  { id: "half", name: "半壁江山", desc: "走过的面积占中国一半", measure: (s) => ({ have: Math.floor(s.areaPct * 2), need: 100 }) },
  { id: "allprovinces", name: "走遍全国", desc: "34 个省级行政区全部点亮", measure: (s) => ({ have: s.provinces.size, need: CHINA_PROVINCES.length }) },
  { id: "abroad", name: "第一次出国", desc: "在大陆以外留下足迹", measure: (s) => ({ have: Math.min(s.overseas.size, 1), need: 1 }) },
  { id: "continents3", name: "三大洲", desc: "在 3 个大洲留下足迹", measure: (s) => ({ have: Math.min(s.continents.size, 3), need: 3 }) },
  { id: "equator", name: "跨越赤道", desc: "去过南半球", measure: (s) => ({ have: s.south ? 1 : 0, need: 1 }) },
];

export function unlocked(a: AchievementDef, s: Stats): boolean {
  const { have, need } = a.measure(s);
  return have >= need;
}

/** Coarse continent bucket from coordinates — good enough for a badge. */
function continentOf(lat: number, lng: number): string {
  if (lat < -10 && lng > 110) return "oceania";
  if (lat < -10 && lng > -90 && lng < -30) return "south-america";
  if (lng < -30 && lat > 12) return "north-america";
  if (lng > -30 && lng < 60 && lat > 12) return "europe";
  if (lng > -20 && lng < 55 && lat <= 35) return "africa";
  if (lng >= 55) return "asia";
  return "other";
}

export function computeStats(places: Place[]): Stats {
  const regions = new Set<string>();
  const cities = new Set<string>();
  const countries = new Set<string>();
  const provinces = new Set<string>();
  const overseas = new Set<string>();
  const continents = new Set<string>();
  let south = false;

  for (const p of places) {
    const code = p.adcode ?? p.cityId;
    if (isAdcode(code)) {
      regions.add(code);
      // Collapse a district up to its city so "十城" counts cities, not wards.
      const city = levelOf(code) === "district" ? code.slice(0, 4) + "00" : code;
      cities.add(city);
      if (levelOf(code) === "city" || levelOf(code) === "district") {
        provinces.add(code.slice(0, 2) + "0000");
      } else if (levelOf(code) === "province") {
        provinces.add(code);
      }
    } else {
      cities.add(p.cityId || p.name);
    }

    if (p.countryCode) {
      countries.add(p.countryCode);
      if (p.countryCode !== "CN") overseas.add(p.countryCode);
    }
    if (p.lat < 0) south = true;
    if (p.countryCode && p.countryCode !== "CN") continents.add(continentOf(p.lat, p.lng));
  }

  const covered = CHINA_PROVINCES.filter((p) => provinces.has(p.code)).reduce((sum, p) => sum + p.area, 0);
  const areaPct = TOTAL_AREA ? (covered / TOTAL_AREA) * 100 : 0;

  return {
    regions: regions.size,
    cities: cities.size,
    countries: countries.size,
    provinces,
    overseas,
    continents,
    south,
    areaPct,
  };
}
