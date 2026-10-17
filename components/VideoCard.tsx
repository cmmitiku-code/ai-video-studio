"use client";

import { useEffect, useRef } from "react";
import type { FeedVideo } from "@/lib/types";
import { aspectClass, modelName } from "@/lib/utils";

export default function VideoCard({
  video,
  onOpen,
}: {
  video: FeedVideo;
  onOpen: (v: FeedVideo) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  // במסכי מגע (בלי hover) – ניגון אוטומטי כשהכרטיס במרכז המסך
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => (e.intersectionRatio > 0.6 ? el.play().catch(() => {}) : el.pause()),
      { threshold: [0, 0.6, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const play = () => ref.current?.play().catch(() => {});
  const stop = () => {
    const v = ref.current;
    if (v) {
      v.pause();
      v.currentTime = 0.1;
    }
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(video)}
      onMouseEnter={play}
      onMouseLeave={stop}
      className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl bg-surface text-start ring-1 ring-line/50 transition hover:ring-brand/40"
    >
      <video
        ref={ref}
        src={video.video_url ? `${video.video_url}#t=0.1` : undefined}
        muted
        loop
        playsInline
        preload="metadata"
        className={`block w-full bg-surface-2 object-cover ${aspectClass(video.aspect_ratio)}`}
      />

      <span className="absolute start-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur ltr">
        {video.duration}s
      </span>
      {video.mode === "image" && (
        <span className="absolute end-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] backdrop-blur">
          תמונה ← וידאו
        </span>
      )}

      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <p className="line-clamp-2 text-sm leading-snug">{video.prompt}</p>
        <p className="mt-1 text-xs text-zinc-400">
          {video.author_name ?? "יוצר/ת"} · <span className="ltr">{modelName(video.model)}</span>
        </p>
      </div>
    </button>
  );
}
