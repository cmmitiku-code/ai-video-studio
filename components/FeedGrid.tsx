"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedVideo } from "@/lib/types";
import VideoCard from "./VideoCard";
import VideoModal from "./VideoModal";

export default function FeedGrid({ initial, pageSize }: { initial: FeedVideo[]; pageSize: number }) {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < pageSize);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<FeedVideo | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || done || !items.length) return;
    setLoading(true);
    try {
      const before = items[items.length - 1].created_at;
      const res = await fetch(`/api/feed?before=${encodeURIComponent(before)}&limit=${pageSize}`);
      const next: FeedVideo[] = res.ok ? await res.json() : [];
      setItems((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
      if (next.length < pageSize) setDone(true);
    } finally {
      setLoading(false);
    }
  }, [loading, done, items, pageSize]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line py-20 text-center text-muted">
        עוד אין סרטונים בגלריה. היו הראשונים ליצור! 🎬
      </div>
    );
  }

  return (
    <>
      <div className="masonry">
        {items.map((v) => (
          <VideoCard key={v.id} video={v} onOpen={setOpen} />
        ))}
      </div>
      <div ref={sentinel} className="py-8 text-center text-sm text-muted">
        {loading ? "טוען עוד…" : done ? "הגעתם לסוף 🎉" : ""}
      </div>
      {open && <VideoModal video={open} onClose={() => setOpen(null)} />}
    </>
  );
}
