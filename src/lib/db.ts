import { openDB, type IDBPDatabase } from "idb";

/**
 * One IndexedDB for everything bulky.
 *
 * Boundary outlines used to live in localStorage next to the user's places.
 * A single province dump is 100–190KB, so ~25 drill-downs would fill the 5MB
 * quota — and a failed `setItem` for `traveltally-state` means the next refresh
 * silently loses the place you just added. Photos already lived here; outlines
 * belong here too. localStorage keeps only the small, synchronous stuff.
 */

const DB_NAME = "traveltally";
const DB_VERSION = 2;

export const PHOTO_STORE = "photos";
export const BOUNDARY_STORE = "boundaries";

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(PHOTO_STORE)) {
          const store = d.createObjectStore(PHOTO_STORE, { keyPath: "id" });
          store.createIndex("placeId", "placeId", { unique: false });
        }
        if (!d.objectStoreNames.contains(BOUNDARY_STORE)) {
          d.createObjectStore(BOUNDARY_STORE, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}
