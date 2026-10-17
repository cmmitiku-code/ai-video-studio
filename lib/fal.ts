import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

/**
 * כתובת ה-webhook ש-fal יקרא אליה בסיום. בפיתוח מקומי (localhost) fal לא יכול
 * להגיע אלינו, ולכן מחזירים null – ואז הסטטוס מתעדכן ב-polling מהדפדפן.
 */
export function falWebhookUrl(videoId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.FAL_WEBHOOK_SECRET;
  if (!base || !secret || !base.startsWith("https://")) return null;
  const url = new URL("/api/fal/webhook", base);
  url.searchParams.set("video", videoId);
  url.searchParams.set("secret", secret);
  return url.toString();
}

export { fal };
