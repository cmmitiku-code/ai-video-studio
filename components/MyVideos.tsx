"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { VideoRow } from "@/lib/types";
import { aspectClass, modelName, timeAgo } from "@/lib/utils";

const POLL_MS = 6000;
const isPending = (v: VideoRow) => v.status === "queued" || v.status === "processing";

export default function MyVideos({ initial, compact = false }: { initial: VideoRow[]; compact?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  useEffect(() => setItems(initial), [initial]);

  const pendingKey = items.filter(isPending).map((v) => v.id).join(",");

  // polling לסרטונים שעדיין בעבודה
  useEffect(() => {
    if (!pendingKey) return;
    const ids = pendingKey.split(",");
    const timer = setInterval(async () => {
      const updates = await Promise.all(
        ids.map((id) =>
          fetch(`/api/videos/${id}`)
            .then((r) => (r.ok ? (r.json() as Promise<VideoRow>) : null))
            .catch(() => null)
        )
      );
      const fresh = updates.filter(Boolean) as VideoRow[];
      setItems((prev) => prev.map((p) => fresh.find((u) => u.id === p.id) ?? p));
      if (fresh.some((u) => !isPending(u))) router.refresh(); // לעדכון קרדיטים אחרי החזר
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [pendingKey, router]);

  async function togglePublic(v: VideoRow) {
    const res = await fetch(`/api/videos/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !v.is_public }),
    });
    if (res.ok) {
      const updated: VideoRow = await res.json();
      setItems((prev) => prev.map((p) => (p.id === v.id ? updated : p)));
    }
  }

  async function remove(v: VideoRow) {
    if (!confirm("למחוק את הסרטון לצמיתות?")) return;
    const res = await fetch(`/api/videos/${v.id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((p) => p.id !== v.id));
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line py-16 text-center text-muted">
        עדיין לא יצרתם סרטונים.
        {!compact && (
          <Link href="/create" className="ms-1 text-brand underline">
            בואו ניצור את הראשון
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" : "masonry"}>
      {items.map((v) => (
        <article
          key={v.id}
          className="mb-3 break-inside-avoid overflow-hidden rounded-xl border border-line bg-surface"
        >
          <Media video={v} />
          <div className="flex flex-col gap-2 p-3">
            <p className="line-clamp-2 text-sm">{v.prompt}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span className="ltr">{modelName(v.model)}</span>·<span>{v.duration} שנ׳</span>·
              <span>⚡{v.credits_cost}</span>·<span>{timeAgo(v.created_at)}</span>
            </div>
            {v.status === "completed" && (
              <div className="flex gap-2 pt-1">
                <a href={v.video_url!} target="_blank" rel="noreferrer" download className="btn-ghost flex-1 px-2 py-1.5 text-xs">
                  הורדה
                </a>
                <button onClick={() => togglePublic(v)} className="btn-ghost flex-1 px-2 py-1.5 text-xs">
                  {v.is_public ? "🌐 ציבורי" : "🔒 פרטי"}
                </button>
                <button onClick={() => remove(v)} className="btn-ghost px-2 py-1.5 text-xs" aria-label="מחיקה">
                  🗑
                </button>
              </div>
            )}
            {v.status === "failed" && (
              <div className="flex items-center gap-2 pt-1">
                <Link href={`/create?prompt=${encodeURIComponent(v.prompt)}`} className="btn-ghost flex-1 px-2 py-1.5 text-xs">
                  ניסיון חוזר
                </Link>
                <button onClick={() => remove(v)} className="btn-ghost px-2 py-1.5 text-xs" aria-label="מחיקה">
                  🗑
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function Media({ video: v }: { video: VideoRow }) {
  const aspect = aspectClass(v.aspect_ratio) || "aspect-video";

  if (v.status === "completed" && v.video_url) {
    return (
      <video
        src={`${v.video_url}#t=0.1`}
        controls
        loop
        playsInline
        preload="metadata"
        className={`block w-full bg-black object-cover ${aspectClass(v.aspect_ratio)}`}
      />
    );
  }

  if (v.status === "failed") {
    return (
      <div className={`flex ${aspect} w-full flex-col items-center justify-center gap-1 bg-red-500/5 p-4 text-center`}>
        <span className="text-2xl">⚠️</span>
        <p className="text-sm font-medium text-red-300">היצירה נכשלה</p>
        <p className="line-clamp-2 text-xs text-muted">{v.error}</p>
        <p className="text-xs text-brand">הקרדיטים הוחזרו לחשבונך</p>
      </div>
    );
  }

  return (
    <div className={`shimmer relative flex ${aspect} w-full flex-col items-center justify-center gap-2 overflow-hidden bg-surface-2`}>
      {v.input_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.input_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm" />
      )}
      <span className="relative h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      <p className="relative text-sm">{v.status === "queued" ? "ממתין בתור…" : "יוצר את הסרטון…"}</p>
      <p className="relative text-xs text-muted">בדרך כלל לוקח 1–4 דקות</p>
    </div>
  );
}
