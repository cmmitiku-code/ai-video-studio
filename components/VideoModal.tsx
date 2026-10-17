"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FeedVideo } from "@/lib/types";
import { modelName, timeAgo } from "@/lib/utils";

export default function VideoModal({ video, onClose }: { video: FeedVideo; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const copy = async () => {
    await navigator.clipboard.writeText(video.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        className="grid max-h-full w-full max-w-6xl overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-[1fr_340px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 items-center justify-center bg-black">
          <video
            src={video.video_url ?? undefined}
            controls
            autoPlay
            loop
            playsInline
            className="max-h-[70vh] w-full object-contain lg:max-h-[85vh]"
          />
        </div>

        <aside className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">{video.author_name ?? "יוצר/ת"}</p>
              <p className="text-xs text-muted">{timeAgo(video.created_at)}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-white" aria-label="סגירה">
              ✕
            </button>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted">פרומפט</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{video.prompt}</p>
          </div>

          {video.input_image_url && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted">תמונת מקור</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={video.input_image_url} alt="" className="max-h-40 rounded-lg" />
            </div>
          )}

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Meta k="מודל" v={<span className="ltr">{modelName(video.model)}</span>} />
            <Meta k="משך" v={`${video.duration} שניות`} />
            <Meta k="סוג" v={video.mode === "image" ? "תמונה לווידאו" : "טקסט לווידאו"} />
            {video.aspect_ratio && <Meta k="יחס" v={<span className="ltr">{video.aspect_ratio}</span>} />}
          </dl>

          <div className="mt-auto flex flex-col gap-2">
            <Link href={`/create?prompt=${encodeURIComponent(video.prompt)}`} className="btn-brand py-2.5">
              ✨ צרו עם הפרומפט הזה
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copy} className="btn-ghost">
                {copied ? "הועתק ✓" : "העתקת פרומפט"}
              </button>
              {video.video_url && (
                <a href={video.video_url} target="_blank" rel="noreferrer" download className="btn-ghost">
                  הורדה
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <dt className="text-[11px] text-muted">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
