export type LatLng = [number, number];

export interface City {
  /** GeoNames id */
  i: string;
  /** City name (English / transliterated) */
  n: string;
  /** Coordinates [lat, lng] */
  c: LatLng;
  /** ISO 3166-1 alpha-2 country code */
  p: string;
}

/**
 * A single visit record. A city may be visited multiple times (each is a Place).
 */
export interface Place {
  id: string;
  /** Display name, user-editable */
  name: string;
  /** GeoNames id this place is bound to */
  cityId: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  /** ISO date strings */
  visitedStart: string;
  visitedEnd: string;
  /** Trip type / tag */
  kind: PlaceKind;
  note: string;
  /** Photo ids stored in IndexedDB; resolved via photoStore.get(id) */
  photoIds: string[];
  /** Tailwind color class for marker */
  color: PlaceColor;
  /** Whether this place was added under the China view (for province aggregations) */
  chinaRegion?: { province: string; provinceCode: string };
  /**
   * Administrative division code this visit lights up.
   * China: adcode (e.g. "510100" for 成都市, "510104" for 锦江区).
   * Older records fall back to `cityId`.
   */
  adcode?: string;
  /** Depth of the administrative division, used to decide which level gets filled. */
  level?: AdminLevel;
  /**
   * Cache key of this city's outline in lib/worldBoundaries (OSM id, e.g. "R71525").
   * Set once the outline has been resolved, so later visits skip the lookup.
   */
  boundaryKey?: string;
  /**
   * Canonical Latin name for the boundary cache lookup. Chinese/Japanese city
   * aliases (东京→Tokyo) keep their display name in the user's script, but
   * the static OSM bundle is keyed by Latin — so we record the Latin form here.
   */
  lookupName?: string;
  createdAt: number;
}

/** Administrative division granularity. */
export type AdminLevel = "province" | "city" | "district";


export type PlaceKind =
  | "travel"
  | "business"
  | "study"
  | "home"
  | "transit"
  | "other";

export type PlaceColor =
  | "amber"
  | "rose"
  | "violet"
  | "sky"
  | "emerald"
  | "fuchsia";

/**
 * A friend's "you haven't been here" list, accepted from their share link.
 * Computed locally from their snapshot minus your own map — nothing is sent back.
 */
export interface Challenge {
  id: string;
  /** Nickname of whoever sent the link, or a generic label. */
  from: string;
  /** Adcodes they have and you didn't, at the time you accepted. */
  targets: string[];
  createdAt: number;
}

export interface PhotoBlob {
  id: string;
  placeId: string;
  mime: string;
  blob: Blob;
  createdAt: number;
}

export interface ChinaProvince {
  code: string;
  name: string;
  /** Center [lat, lng] */
  center: LatLng;
  /** Leaflet zoom level to focus the province */
  zoom: number;
  /** Land area in km², used for the "you've covered X% of China" figure. */
  area: number;
}
