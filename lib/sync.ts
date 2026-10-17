import { createAdminClient } from "./supabase/admin";
import { fal } from "./fal";
import { errorMessage } from "./utils";
import { MY_COLUMNS, type VideoRow } from "./types";

const TIMEOUT_MS = 45 * 60 * 1000; // אחרי 45 דק' בלי תוצאה – כישלון + החזר

async function fetchVideo(id: string) {
  const { data } = await createAdminClient().from("videos").select(MY_COLUMNS).eq("id", id).single();
  return data as VideoRow | null;
}

export async function markCompleted(id: string, videoUrl: string) {
  await createAdminClient()
    .from("videos")
    .update({ status: "completed", video_url: videoUrl, error: null, completed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["queued", "processing"]);
  return fetchVideo(id);
}

export async function markFailed(id: string, message: string) {
  await createAdminClient().rpc("fail_video", { p_video: id, p_error: message });
  return fetchVideo(id);
}

/**
 * בודק מול fal את מצב העבודה. משמש כגיבוי ל-webhook (ובפיתוח מקומי – כמנגנון הראשי).
 */
export async function syncVideo(video: VideoRow): Promise<VideoRow> {
  if (video.status !== "queued" && video.status !== "processing") return video;

  const age = Date.now() - new Date(video.created_at).getTime();

  if (!video.fal_request_id) {
    if (age > 10 * 60 * 1000) return (await markFailed(video.id, "העבודה לא נשלחה ל-fal")) ?? video;
    return video;
  }

  try {
    const status = await fal.queue.status(video.endpoint, { requestId: video.fal_request_id });

    if (status.status === "COMPLETED") {
      try {
        const result = await fal.queue.result(video.endpoint, { requestId: video.fal_request_id });
        const url = (result.data as { video?: { url?: string } } | undefined)?.video?.url;
        if (url) return (await markCompleted(video.id, url)) ?? video;
        return (await markFailed(video.id, "לא התקבל קובץ וידאו מהמודל")) ?? video;
      } catch (e) {
        return (await markFailed(video.id, errorMessage(e))) ?? video;
      }
    }

    if (age > TIMEOUT_MS) return (await markFailed(video.id, "תם הזמן ליצירת הסרטון")) ?? video;
    return video;
  } catch {
    // תקלה זמנית מול fal – ננסה שוב בבדיקה הבאה
    return video;
  }
}
