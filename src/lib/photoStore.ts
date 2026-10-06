import type { PhotoBlob } from "@/types";
import { PHOTO_STORE, getDB } from "@/lib/db";

const db = getDB;

export async function savePhoto(photo: PhotoBlob): Promise<void> {
  const d = await db();
  await d.put(PHOTO_STORE, photo);
}

export async function deletePhoto(id: string): Promise<void> {
  const d = await db();
  await d.delete(PHOTO_STORE, id);
}

export async function getPhoto(id: string): Promise<PhotoBlob | undefined> {
  const d = await db();
  return d.get(PHOTO_STORE, id);
}

export async function getPhotosForPlace(placeId: string): Promise<PhotoBlob[]> {
  const d = await db();
  return d.getAllFromIndex(PHOTO_STORE, "placeId", placeId);
}

/**
 * Convert a File to a downscaled JPEG Blob to keep storage reasonable.
 * Max dimension 1600px, quality 0.85.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);

  return new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b ?? file),
      file.type === "image/png" ? "image/png" : "image/jpeg",
      0.85
    );
  });
}

export async function clearPhotos(): Promise<void> {
  const d = await db();
  await d.clear(PHOTO_STORE);
}
