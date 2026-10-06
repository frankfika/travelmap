import { useRef } from "react";
import { useStore } from "@/hooks/useStore";
import { clearPhotos } from "@/lib/photoStore";
import { AchievementWall } from "@/components/AchievementWall";
import { buildSharePayload, encodeShare, shareUrl } from "@/lib/share";
import { clearBoundaryCache } from "@/lib/boundaries";
import { clearWorldCache } from "@/lib/worldBoundaries";
import { exportPlaces } from "@/lib/utils";
import type { Place } from "@/types";

/** Keep only records that have the fields the map needs. */
function sanitize(raw: unknown): Place[] {
  if (!Array.isArray(raw)) throw new Error("文件格式不对");
  return raw
    .filter(
      (p): p is Place =>
        p && typeof p.id === "string" && typeof p.name === "string" && Number.isFinite(p.lat) && Number.isFinite(p.lng)
    )
    .map((p) => ({
      ...p,
      photoIds: Array.isArray(p.photoIds) ? p.photoIds : [],
      note: p.note ?? "",
      visitedStart: p.visitedStart ?? "",
      visitedEnd: p.visitedEnd ?? p.visitedStart ?? "",
      createdAt: p.createdAt ?? Date.now(),
    }));
}

function Row({ title, desc, action }: { title: string; desc: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div>
        <div className="text-[14px] text-fg">{title}</div>
        <div className="text-[13px] text-muted">{desc}</div>
      </div>
      {action}
    </div>
  );
}

const btn = "shrink-0 rounded-md border border-line px-3 py-1.5 text-[13px] text-fg transition-colors hover:bg-fg/5";

export default function Settings() {
  const places = useStore((s) => s.places);
  const importPlaces = useStore((s) => s.importPlaces);
  const clearAll = useStore((s) => s.clearAll);
  const notify = useStore((s) => s.notify);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const incoming = sanitize(Array.isArray(data) ? data : data.places);
      if (places.length && !confirm(`导入 ${incoming.length} 条记录，将替换现有的 ${places.length} 条。继续？`)) return;
      importPlaces(incoming);
      notify(`已导入 ${incoming.length} 条记录`);
    } catch (e) {
      notify(`导入失败：${e instanceof Error ? e.message : "无法读取文件"}`);
    }
  };

  const onShare = async () => {
    if (!places.length) {
      notify("还没有地点可以分享");
      return;
    }
    try {
      const token = await encodeShare(buildSharePayload(places));
      const url = shareUrl(token);
      if (url.length > 8000) {
        notify(`链接太长（${url.length} 字符），部分软件会截断，建议直接发文件导出`);
      }
      await navigator.clipboard.writeText(url);
      notify(`只读链接已复制（${url.length} 字符）`);
    } catch {
      notify("生成链接失败，可能是浏览器不允许访问剪贴板");
    }
  };

  const onClear = async () => {
    if (!confirm("清空所有地点、笔记、照片和已缓存的边界？此操作无法撤销。")) return;
    // Outlines are cached outlines, not user data, but clearing them too keeps
    // the promise honest and frees the space back.
    await Promise.all([clearPhotos(), clearBoundaryCache(), clearWorldCache()]);
    clearAll();
    notify("已清空");
  };

  return (
    <main className="mx-auto max-w-xl px-6 pt-32 pb-16">
      <h1 className="text-lg font-medium tracking-tight">设置</h1>
      <p className="mt-1 text-[13px] text-muted">数据只存在这台设备的浏览器里，没有账号，也没有云端。</p>

      <div className="mt-8">
        <AchievementWall />
      </div>

      <div className="mt-8 divide-y divide-line border-y border-line">
        <Row
          title="导出"
          desc={`${places.length} 条记录，JSON 格式（照片不含在内）`}
          action={
            <button className={btn} onClick={() => exportPlaces(places)}>
              导出
            </button>
          }
        />
        <Row
          title="分享"
          desc="生成只读链接，只包含你去过的地方；笔记和照片不会离开本机"
          action={
            <button className={btn} onClick={onShare}>
              复制链接
            </button>
          }
        />
        <Row
          title="导入"
          desc="从之前导出的 JSON 恢复"
          action={
            <>
              <button className={btn} onClick={() => fileRef.current?.click()}>
                选择文件
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f);
                  e.target.value = "";
                }}
              />
            </>
          }
        />
        <Row
          title="清空"
          desc="删除所有地点、笔记和照片，不可恢复"
          action={
            <button className={btn} onClick={onClear}>
              清空
            </button>
          }
        />
      </div>

      <p className="mt-16 text-xs text-muted">TravelTally · MIT License</p>
    </main>
  );
}
