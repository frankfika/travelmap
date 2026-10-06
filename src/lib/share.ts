import type { Place } from "@/types";
import { isAdcode, levelOf } from "@/lib/adcode";

/**
 * Read-only share links.
 *
 * Each visitor already has their own data — localStorage and IndexedDB are
 * per-browser. What was missing is a way to *show* your map to someone else
 * without a backend. The whole payload lives in the URL fragment, so nothing
 * is uploaded anywhere.
 *
 * Privacy by construction: only where you've been travels in the link.
 * Notes, photos, dates and exact coordinates stay on your machine.
 *
 * Granularity: Chinese entries are coarsened to city level by default. A
 * district-level list is a home address in disguise — someone who lit up two
 * districts of one city has effectively published where they live.
 */

export interface SharePayload {
  v: 1;
  /** Optional nickname to show on the shared map. */
  n?: string;
  /** Lit Chinese adcodes. */
  c: string[];
  /** World cities as [name, countryCode] — the receiver fetches outlines. */
  w: [string, string][];
}

export const MAX_SHARE_PLACES = 600;

export interface ShareOptions {
  /** Include district-level codes. Off by default — see the note above. */
  includeDistricts?: boolean;
}

/** Round a district code up to its city; leave provinces and cities alone. */
function coarsen(code: string, includeDistricts: boolean): string {
  if (includeDistricts) return code;
  return levelOf(code) === "district" ? code.slice(0, 4) + "00" : code;
}

export function buildSharePayload(
  places: Place[],
  nickname?: string,
  options: ShareOptions = {}
): SharePayload {
  const china = new Set<string>();
  const world: [string, string][] = [];
  const seenWorld = new Set<string>();
  const includeDistricts = options.includeDistricts === true;

  for (const p of places) {
    const code = p.adcode ?? p.cityId;
    if (p.countryCode === "CN" && isAdcode(code)) {
      china.add(coarsen(code, includeDistricts));
      continue;
    }
    if (p.countryCode && p.countryCode !== "CN" && p.name) {
      const key = `${p.countryCode}:${p.name.toLowerCase()}`;
      if (seenWorld.has(key)) continue;
      seenWorld.add(key);
      world.push([p.name, p.countryCode]);
    }
  }

  return {
    v: 1,
    n: nickname?.slice(0, 24) || undefined,
    c: [...china].slice(0, MAX_SHARE_PLACES),
    w: world.slice(0, 120),
  };
}

/* ---------------- encoding ---------------- */

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** deflate when the browser has it (all modern ones), else fall back to raw. */
async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") return bytes;
  try {
    const cs = new CompressionStream("deflate-raw");
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(cs);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return bytes;
  }
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") return bytes;
  try {
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return bytes;
  }
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = JSON.stringify(payload);
  const packed = await deflate(new TextEncoder().encode(json));
  return `1.${toBase64Url(packed)}`;
}

export async function decodeShare(token: string): Promise<SharePayload | null> {
  try {
    const [version, body] = token.split(".", 2);
    if (version !== "1" || !body) return null;
    const raw = await inflate(fromBase64Url(body));
    const parsed = JSON.parse(new TextDecoder().decode(raw)) as SharePayload;
    if (parsed?.v !== 1 || !Array.isArray(parsed.c)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Turn a payload back into place-like rows the map can render. */
export function payloadToPlaces(payload: SharePayload): Place[] {
  const today = new Date().toISOString().slice(0, 10);
  const base = {
    country: "",
    countryCode: "CN",
    lat: 0,
    lng: 0,
    visitedStart: today,
    visitedEnd: today,
    kind: "travel" as const,
    note: "",
    photoIds: [],
    color: "amber" as const,
    createdAt: 0,
  };

  const china: Place[] = payload.c.map((code, i) => ({
    ...base,
    id: `s-cn-${code}-${i}`,
    name: code,
    cityId: code,
    adcode: code,
    level: code.endsWith("0000") ? ("province" as const) : code.endsWith("00") ? ("city" as const) : ("district" as const),
    createdAt: i,
  }));

  const world: Place[] = payload.w.map(([name, cc], i) => ({
    ...base,
    id: `s-w-${i}`,
    name,
    cityId: `share-${i}`,
    countryCode: cc,
    country: cc,
    createdAt: 1000 + i,
  }));

  return [...china, ...world];
}

/** Share link for the current deployment (works from file:// and any host). */
export function shareUrl(token: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/s/${token}`;
}
