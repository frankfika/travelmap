import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Place } from "@/types";
import { useStore } from "@/hooks/useStore";
import { compressImage, deletePhoto, getPhoto, savePhoto } from "@/lib/photoStore";
import { cn, formatDateRange, uid } from "@/lib/utils";

interface Photo {
  id: string;
  url: string;
}

function usePhotos(place: Place) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      const out: Photo[] = [];
      for (const id of place.photoIds ?? []) {
        const p = await getPhoto(id);
        if (!p) continue;
        const url = URL.createObjectURL(p.blob);
        urls.push(url);
        out.push({ id, url });
      }
      if (!cancelled) setPhotos(out);
    })();
    return () => {
      cancelled = true;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [place.id, place.photoIds]);
  return photos;
}

const field =
  "w-full rounded-md border border-line bg-transparent px-3 py-2 text-[14px] text-fg outline-none transition-colors placeholder:text-muted focus:border-fg/25";

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-md text-muted transition-colors hover:bg-fg/5 hover:text-fg"
    >
      {children}
    </button>
  );
}

export function PlaceDrawer({ place }: { place: Place }) {
  const updatePlace = useStore((s) => s.updatePlace);
  const removePlace = useStore((s) => s.removePlace);
  const selectPlace = useStore((s) => s.selectPlace);
  const photos = usePhotos(place);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(place);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditing(false);
    setDraft(place);
  }, [place.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = () => {
    setDraft(place);
    setEditing(true);
  };

  const save = () => {
    updatePlace(place.id, {
      name: draft.name.trim() || place.name,
      visitedStart: draft.visitedStart,
      visitedEnd: draft.visitedEnd < draft.visitedStart ? draft.visitedStart : draft.visitedEnd,
      note: draft.note,
    });
    setEditing(false);
  };

  const upload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    const ids: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const blob = await compressImage(file);
        const id = uid();
        await savePhoto({ id, placeId: place.id, mime: blob.type, blob, createdAt: Date.now() });
        ids.push(id);
      } catch (err) {
        console.error(err);
      }
    }
    if (ids.length) updatePlace(place.id, { photoIds: [...(place.photoIds ?? []), ...ids] });
    setUploading(false);
  };

  const removePhoto = async (id: string) => {
    await deletePhoto(id);
    updatePlace(place.id, { photoIds: (place.photoIds ?? []).filter((x) => x !== id) });
  };

  const remove = () => {
    if (!confirm(`删除「${place.name}」？照片也会一并删除。`)) return;
    (place.photoIds ?? []).forEach((id) => deletePhoto(id));
    removePlace(place.id);
  };

  const location = [place.country, place.chinaRegion?.province].filter(Boolean).join(" · ");

  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="surface thin-scrollbar fixed top-16 right-4 z-[1100] max-h-[calc(100vh-80px)] flex w-[min(360px,calc(100vw-32px))] flex-col overflow-y-auto"
    >
      <div className="flex items-center justify-between px-6 pt-4">
        <span className="text-xs text-muted">{location || "自定义地点"}</span>
        <div className="-mr-2 flex items-center">
          {!editing && (
            <>
              <IconButton label="编辑" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label="删除" onClick={remove}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </>
          )}
          <IconButton label="关闭" onClick={() => selectPlace(null)}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3 px-6 pt-3 pb-6">
          <input
            className={cn(field, "text-[16px] font-medium")}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            aria-label="名称"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className={field}
              value={draft.visitedStart}
              onChange={(e) => setDraft({ ...draft, visitedStart: e.target.value })}
              aria-label="开始日期"
            />
            <input
              type="date"
              className={field}
              value={draft.visitedEnd}
              onChange={(e) => setDraft({ ...draft, visitedEnd: e.target.value })}
              aria-label="结束日期"
            />
          </div>
          <textarea
            className={cn(field, "min-h-28 resize-none leading-relaxed")}
            value={draft.note}
            placeholder="写点什么…"
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            aria-label="笔记"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="rounded-md px-3 py-1.5 text-[13px] text-muted hover:text-fg">
              取消
            </button>
            <button onClick={save} className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-fg">
              保存
            </button>
          </div>
        </div>
      ) : (
        <div className="px-6 pt-1 pb-2">
          <h2 className="text-xl font-medium tracking-tight">{place.name}</h2>
          <p className="mt-0.5 text-[13px] tabular-nums text-muted">{formatDateRange(place.visitedStart, place.visitedEnd)}</p>
          {place.note ? (
            <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-fg/90">{place.note}</p>
          ) : (
            <button onClick={startEdit} className="mt-4 text-[13px] text-muted hover:text-fg">
              添加笔记
            </button>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-line px-6 py-4">
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md border border-line">
              <a href={p.url} target="_blank" rel="noreferrer">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </a>
              {editing && (
                <button
                  onClick={() => removePhoto(p.id)}
                  aria-label="删除照片"
                  className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-md bg-black/60 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            className="grid aspect-square place-items-center rounded-md border border-dashed border-line text-muted transition-colors hover:border-fg/20 hover:text-fg"
            aria-label="添加照片"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </motion.aside>
  );
}
