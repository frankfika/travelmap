import type { AdminLevel, City, Place, PlaceKind } from "@/types";
import { CHINA_CITIES, guessChinaRegion, provinceByCode } from "@/data/china";
import { COUNTRY_NAMES, countryName, defaultCities } from "@/data/cities";
import { loadCityShard } from "@/hooks/useCitySearch";
import { useStore } from "@/hooks/useStore";
import { KIND_COLOR } from "@/lib/colors";
import { levelOf } from "@/lib/adcode";

/**
 * Natural-language travel parser.
 * "我去年春天去了成都和东京" → { cities: [成都, 东京], dateStart: "2025-03-01", kind: "travel" }
 *
 * With VITE_ANTHROPIC_API_KEY set, Claude does the parsing; otherwise (or on any
 * failure) a local rule-based parser runs. City names are then resolved against
 * CHINA_CITIES and the GeoNames shards.
 */

export interface CityQuery {
  name: string;
  /** Alternate spelling to try if `name` doesn't resolve (e.g. English name) */
  alt?: string;
  countryCode?: string;
}

export interface ParsedTravel {
  cities: CityQuery[];
  dateStart: string;
  dateEnd: string;
  kind: PlaceKind;
}

export interface ResolvedCity {
  name: string;
  cityId: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  chinaRegion?: { province: string; provinceCode: string };
  /** Set when the resolved city is in mainland China and we matched an adcode. */
  adcode?: string;
  level?: AdminLevel;
  /**
   * Canonical Latin name for boundary cache lookup. ZH_ALIAS-resolved cities
   * (东京→Tokyo) keep their display name in Chinese but the static OSM bundle
   * is keyed by Latin — we record the Latin form for the cache lookup.
   */
  lookupName?: string;
}

/* ------------------------------------------------------------------ */
/* Dictionaries                                                        */
/* ------------------------------------------------------------------ */

/** Chinese names of foreign cities → GeoNames English name */
const ZH_ALIAS: Record<string, string> = {
  东京: "Tokyo", 京都: "Kyoto", 大阪: "Osaka", 札幌: "Sapporo", 名古屋: "Nagoya", 福冈: "Fukuoka",
  首尔: "Seoul", 釜山: "Busan", 曼谷: "Bangkok", 清迈: "Chiang Mai", 普吉: "Phuket",
  新加坡: "Singapore", 吉隆坡: "Kuala Lumpur", 河内: "Hanoi", 胡志明市: "Ho Chi Minh City",
  马尼拉: "Manila", 雅加达: "Jakarta", 巴厘岛: "Denpasar", 迪拜: "Dubai", 多哈: "Doha",
  伊斯坦布尔: "Istanbul", 开罗: "Cairo", 莫斯科: "Moscow", 巴黎: "Paris", 伦敦: "London",
  罗马: "Rome", 米兰: "Milan", 威尼斯: "Venice", 佛罗伦萨: "Florence", 巴塞罗那: "Barcelona",
  马德里: "Madrid", 柏林: "Berlin", 慕尼黑: "Munich", 阿姆斯特丹: "Amsterdam", 维也纳: "Vienna",
  布拉格: "Prague", 苏黎世: "Zurich", 日内瓦: "Geneva", 布鲁塞尔: "Brussels", 斯德哥尔摩: "Stockholm",
  哥本哈根: "Copenhagen", 赫尔辛基: "Helsinki", 奥斯陆: "Oslo", 纽约: "New York City",
  洛杉矶: "Los Angeles", 旧金山: "San Francisco", 西雅图: "Seattle", 芝加哥: "Chicago",
  波士顿: "Boston", 华盛顿: "Washington", 拉斯维加斯: "Las Vegas", 迈阿密: "Miami",
  檀香山: "Honolulu", 温哥华: "Vancouver", 多伦多: "Toronto", 蒙特利尔: "Montreal",
  墨西哥城: "Mexico City", 悉尼: "Sydney", 墨尔本: "Melbourne", 布里斯班: "Brisbane",
  奥克兰: "Auckland", 孟买: "Mumbai", 新德里: "New Delhi", 乌兰巴托: "Ulaanbaatar",
  雷克雅未克: "Reykjavik",
};

const zhCity = (n: string) => n.replace(/(市|地区)$/, "");

/** Longest first, so "胡志明市" wins over shorter overlaps */
const ZH_NAMES = [...new Set([...CHINA_CITIES.map((c) => zhCity(c.name)), ...Object.keys(ZH_ALIAS)])]
  .filter((n) => n.length >= 2)
  .sort((a, b) => b.length - a.length);

const ZH_COUNTRY = Object.entries(COUNTRY_NAMES).map(([code, name]) => ({ code, name }));

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b/;

const STOP = new Set(
  (
    "i me my we our went go going gone been to visit visited visiting in at on from the a an and with for of " +
    "trip travel traveled travelled travelling traveling business work conference study school home family " +
    "transit layover vacation holiday last this next year years month week ago yesterday today " +
    "spring summer autumn fall winter " +
    "january february march april may june july august september october november december " +
    MONTHS.join(" ") + " sep sept"
  ).split(" ")
);

const KIND_RULES: [RegExp, PlaceKind][] = [
  [/出差|商务|开会|会议|\b(business|work|conference)\b/, "business"],
  [/学习|读书|留学|交换|游学|研学|\b(study|school)\b/, "study"],
  [/探亲|回家|老家|家乡|\b(home|family)\b/, "home"],
  [/转机|中转|经停|\b(transit|layover)\b/, "transit"],
];

/* ------------------------------------------------------------------ */
/* Local parser                                                        */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const iso = (y: number, m: number, d = 1) => `${y}-${pad(m)}-${pad(d)}`;

export function parseDates(text: string, now = new Date()): { start: string; end: string } {
  const t = text.toLowerCase();
  const Y = now.getFullYear();
  const today = isoDay(now);

  const full = [...t.matchAll(/(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/g)].map((m) =>
    iso(+m[1], +m[2], +m[3])
  );
  if (full.length) return { start: full[0], end: full[1] ?? full[0] };

  const shift = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return isoDay(d);
  };
  if (/前天/.test(t)) return { start: shift(2), end: shift(2) };
  if (/昨天|yesterday/.test(t)) return { start: shift(1), end: shift(1) };
  if (/上周|上星期|last week/.test(t)) return { start: shift(7), end: shift(7) };

  let y: number | undefined;
  let m: number | undefined;

  const ym = t.match(/(?<!\d)(\d{4})\s*[-/.]\s*(\d{1,2})(?!\d)/);
  if (ym) [y, m] = [+ym[1], +ym[2]];
  else {
    const yy = t.match(/(?<!\d)(19\d{2}|20\d{2})(?!\d)/);
    if (yy) y = +yy[1];
  }
  if (y === undefined) {
    if (/前年/.test(t)) y = Y - 2;
    else if (/去年|last year/.test(t)) y = Y - 1;
    else if (/明年|next year/.test(t)) y = Y + 1;
    else if (/今年|this year/.test(t)) y = Y;
  }

  if (m === undefined) {
    const zhM = t.match(/(\d{1,2})\s*月/);
    const enM = t.match(MONTH_RE);
    if (zhM) m = +zhM[1];
    else if (enM) m = MONTHS.indexOf(enM[1].slice(0, 3)) + 1;
    else if (/上个?月|last month/.test(t)) {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      y ??= d.getFullYear();
      m = d.getMonth() + 1;
    } else if (/这个月|本月|this month/.test(t)) m = now.getMonth() + 1;
    else if (/春节/.test(t)) m = 2;
    else if (/春|\bspring\b/.test(t)) m = 3;
    else if (/夏|\bsummer\b/.test(t)) m = 6;
    else if (/秋|\b(autumn|fall)\b/.test(t)) m = 9;
    else if (/冬|\bwinter\b/.test(t)) m = 12;
  }
  if (m !== undefined && (m < 1 || m > 12)) m = undefined;

  if (y === undefined && m === undefined) return { start: today, end: today };
  // A bare month means its most recent occurrence
  y ??= m! > now.getMonth() + 1 ? Y - 1 : Y;
  // Current year without a month: today is the best guess
  if (m === undefined) return y === Y ? { start: today, end: today } : { start: iso(y, 1), end: iso(y, 1) };
  return { start: iso(y, m), end: iso(y, m) };
}

export function parseLocal(text: string, now = new Date()): ParsedTravel {
  let rest = text;
  const cities: CityQuery[] = [];

  // Chinese: greedy longest match against known names
  for (let i = 0; i < rest.length; ) {
    const hit = ZH_NAMES.find((n) => rest.startsWith(n, i));
    if (hit) {
      cities.push({ name: hit });
      rest = rest.slice(0, i) + " ".repeat(hit.length) + rest.slice(i + hit.length);
      i += hit.length;
    } else i++;
  }

  // Latin: runs of non-stopwords inside Latin segments ("New York", "Ho Chi Minh City").
  // The split is over every character that isn't a letter, a mark, or a quote
  // we want to keep, so accented names like "München" stay together. Typographic
  // single quotes and apostrophes are kept; ASCII straight quotes get trimmed
  // at the edges so '"'Paris'"' arrives at Nominatim as 'Paris'.
  for (const seg of rest.split(/[^\p{L}\p{M}’'.\- ]+/u)) {
    let run: string[] = [];
    const flush = () => {
      if (run.length) {
        cities.push({ name: run.join(" ").replace(/^["'„“”«»‹›]+|["'„“”«»‹›]+$/gu, "") });
      }
      run = [];
    };
    for (const w of seg.split(/\s+/).filter(Boolean)) {
      if (STOP.has(w.toLowerCase()) || w.length < 2) flush();
      else run.push(w);
    }
    flush();
  }
  for (const c of cities) rest = rest.replace(c.name, " ");

  const country = ZH_COUNTRY.find((c) => text.includes(c.name))?.code;
  if (country) for (const c of cities) c.countryCode ??= country;

  const lower = rest.toLowerCase();
  const kind = KIND_RULES.find(([re]) => re.test(lower))?.[1] ?? "travel";
  const { start, end } = parseDates(rest, now);
  return { cities, dateStart: start, dateEnd: end, kind };
}

/* ------------------------------------------------------------------ */
/* Claude parser (optional)                                            */
/* ------------------------------------------------------------------ */

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
export const hasClaude = !!API_KEY;

const SCHEMA = {
  type: "object",
  properties: {
    cities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name_en: { type: "string" },
          name_zh: { type: "string" },
          country_code: { type: "string" },
        },
        required: ["name_en", "name_zh", "country_code"],
        additionalProperties: false,
      },
    },
    date_start: { type: "string" },
    date_end: { type: "string" },
    kind: { type: "string", enum: ["travel", "business", "study", "home", "transit", "other"] },
  },
  required: ["cities", "date_start", "date_end", "kind"],
  additionalProperties: false,
};

// ponytail: the key ships in the browser bundle — fine for a private local app,
// move behind a proxy before deploying publicly.
async function parseWithClaude(text: string): Promise<ParsedTravel | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-5-5",
      max_tokens: 2048,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system:
        `Extract the cities a traveller visited from their sentence. Today is ${isoDay(new Date())}. ` +
        `name_en: common English (GeoNames) name, e.g. "Chengdu", "Tokyo", "New York City". ` +
        `name_zh: Chinese name if known, else "". country_code: ISO 3166-1 alpha-2. ` +
        `Dates are YYYY-MM-DD; a bare year/month/season becomes its first day; no date means today. ` +
        `kind: business for work trips, home for visiting family, study, transit, otherwise travel.`,
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.stop_reason !== "end_turn") return null;
  const block = (data.content as { type: string; text?: string }[]).find((b) => b.type === "text");
  if (!block?.text) return null;
  const out = JSON.parse(block.text);
  return {
    cities: out.cities.map((c: { name_en: string; name_zh: string; country_code: string }) => ({
      name: c.name_zh || c.name_en,
      alt: c.name_en,
      countryCode: c.country_code,
    })),
    dateStart: out.date_start,
    dateEnd: out.date_end || out.date_start,
    kind: out.kind,
  };
}

export async function parseTravel(text: string): Promise<ParsedTravel> {
  if (API_KEY) {
    const ai = await parseWithClaude(text).catch(() => null);
    if (ai?.cities.length) return ai;
  }
  return parseLocal(text);
}

/* ------------------------------------------------------------------ */
/* City resolution                                                     */
/* ------------------------------------------------------------------ */

const CJK = /[\u4e00-\u9fff]/;
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

async function findWorldCity(name: string, countryCode?: string): Promise<City | null> {
  const key = norm(name);
  const pool = [...(await loadCityShard(key)), ...defaultCities];
  const exact = pool.filter((c) => norm(c.n) === key);
  return (
    exact.find((c) => c.p === countryCode) ??
    exact[0] ??
    (key.length >= 4 ? pool.find((c) => norm(c.n).startsWith(key)) : undefined) ??
    null
  );
}

function fromWorld(c: City, display: string): ResolvedCity {
  const china =
    c.p === "CN"
      ? (() => {
          // The OSM/GeoNames result for a Chinese city arrives in Latin script
          // ("Chengdu"). Map back to our adcode so the world view can render
          // the same Chinese outline as the China view, and so the name reads
          // as 成都 instead of Chengdu.
          const cn = nearestChinaCity(c.c[0], c.c[1], c.n);
          if (!cn) return { chinaRegion: guessChinaRegion(c.c[0], c.c[1]) };
          const p = provinceByCode(cn.provinceCode);
          return {
            name: zhCity(cn.name),
            adcode: cn.code,
            level: levelOf(cn.code),
            chinaRegion: p ? { province: p.name, provinceCode: p.code } : guessChinaRegion(c.c[0], c.c[1]),
          };
        })()
      : null;
  return {
    name: china?.name ?? display,
    lookupName: c.n, // Latin form used for boundary cache key
    cityId: c.i,
    country: countryName(c.p),
    countryCode: c.p,
    lat: c.c[0],
    lng: c.c[1],
    adcode: china?.adcode,
    level: china?.level,
    chinaRegion: china?.chinaRegion,
  };
}

/**
 * Match an OSM/GeoNames Chinese city to our adcode-bearing CHINA_CITIES list.
 * Two passes — exact name first (handles "Chengdu"/"成都"), then nearest
 * neighbour within ~40 km (handles "Pudong"/"Lhasa" etc.).
 */
function nearestChinaCity(lat: number, lng: number, osmName: string) {
  const en = norm(osmName);
  const byName = CHINA_CITIES.find((c) => norm(zhCity(c.name)) === en);
  if (byName) return byName;
  let best: (typeof CHINA_CITIES)[number] | undefined;
  let bestD = 0.5; // ~50 km
  for (const c of CHINA_CITIES) {
    const d = Math.hypot(c.lat - lat, c.lng - lng);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export async function resolveCity(q: CityQuery): Promise<ResolvedCity | null> {
  for (const n of [q.name, q.alt]) {
    if (!n) continue;
    if (CJK.test(n)) {
      const cn = CHINA_CITIES.find((c) => zhCity(c.name) === zhCity(n));
      if (cn) {
        const p = provinceByCode(cn.provinceCode);
        return {
          name: zhCity(cn.name),
          cityId: cn.code,
          country: "中国",
          countryCode: "CN",
          lat: cn.lat,
          lng: cn.lng,
          chinaRegion: p ? { province: p.name, provinceCode: p.code } : undefined,
        };
      }
      const en = ZH_ALIAS[n];
      const c = en && (await findWorldCity(en, q.countryCode));
      if (c) return fromWorld(c, n);
    } else {
      const c = await findWorldCity(n, q.countryCode);
      if (c) return fromWorld(c, q.name !== n && CJK.test(q.name) ? q.name : c.n);
    }
  }
  return null;
}

/**
 * Parse → resolve → addPlace. Selects the last added place (the map flies to it)
 * and shows a toast. Returns what was added and what couldn't be found.
 */
export async function addFromText(text: string): Promise<{ added: ResolvedCity[]; missed: string[] }> {
  const parsed = await parseTravel(text);
  const resolved = await Promise.all(parsed.cities.map(resolveCity));
  const { addPlace, selectPlace, notify } = useStore.getState();

  const added = resolved.filter((r): r is ResolvedCity => !!r);
  const missed = parsed.cities.filter((_, i) => !resolved[i]).map((c) => c.name);

  let lastId: string | null = null;
  for (const r of added) {
    lastId = addPlace({
      ...r,
      visitedStart: parsed.dateStart,
      visitedEnd: parsed.dateEnd,
      kind: parsed.kind,
      note: "",
      photoIds: [],
      color: KIND_COLOR[parsed.kind],
    });
  }
  if (lastId) {
    selectPlace(lastId);
    notify(`已记录 ${added.map((a) => a.name).join("、")}`);
  }
  return { added, missed };
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export function summarize(places: Place[]): string {
  if (!places.length) return "还没有记录。告诉我你去过哪里，比如「去年春天去了成都」。";
  const cities = new Set(places.map((p) => p.cityId)).size;
  const countries = new Set(places.map((p) => p.countryCode).filter(Boolean)).size;
  const parts = [`${places.length} 次出行，${cities} 座城市，${countries} 个国家或地区。`];

  const count = (key: (p: Place) => string) => {
    const m = new Map<string, number>();
    for (const p of places) m.set(key(p), (m.get(key(p)) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1])[0];
  };
  const [year, yearN] = count((p) => p.visitedStart.slice(0, 4));
  if (yearN > 1) parts.push(`${year} 年走得最多，共 ${yearN} 次。`);
  const [fav, favN] = count((p) => p.name);
  if (favN > 1) parts.push(`${fav} 去了 ${favN} 次，是你最常回去的地方。`);
  const first = [...places].sort((a, b) => a.visitedStart.localeCompare(b.visitedStart))[0];
  parts.push(`最早的一笔是 ${first.visitedStart.slice(0, 4)} 年的 ${first.name}。`);
  return parts.join("");
}
