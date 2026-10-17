import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fal, falWebhookUrl } from "@/lib/fal";
import { ASPECT_RATIOS, buildFalInput, calcCost, getModel, type AspectRatio } from "@/lib/models";
import { errorMessage } from "@/lib/utils";

export const runtime = "nodejs";

interface Body {
  mode?: string;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
  withAudio?: boolean;
  imageUrl?: string;
  isPublic?: boolean;
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("יש להתחבר כדי ליצור סרטונים", 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("בקשה לא תקינה");
  }

  // ---------- ולידציה ----------
  const model = getModel(body.model);
  if (!model) return bad("מודל לא קיים");

  const mode = body.mode === "image" ? "image" : "text";
  const prompt = String(body.prompt ?? "").trim();
  if (prompt.length < 3) return bad("הפרומפט קצר מדי");
  if (prompt.length > 2500) return bad("הפרומפט ארוך מדי (עד 2,500 תווים)");

  const duration = Number(body.duration);
  if (!model.durations.includes(duration)) return bad("משך לא נתמך במודל הזה");

  const aspectRatio: AspectRatio = ASPECT_RATIOS.some((a) => a.value === body.aspectRatio)
    ? (body.aspectRatio as AspectRatio)
    : "16:9";
  const withAudio = model.audio && Boolean(body.withAudio);
  const negativePrompt = String(body.negativePrompt ?? "").trim().slice(0, 1000);
  const isPublic = body.isPublic !== false;

  let imageUrl: string | null = null;
  if (mode === "image") {
    imageUrl = String(body.imageUrl ?? "");
    // התמונה חייבת להגיע מהתיקייה של המשתמש ב-Storage שלנו
    const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inputs/${user.id}/`;
    if (!imageUrl.startsWith(prefix)) return bad("תמונה לא תקינה");
  }

  const cost = calcCost(model, duration, withAudio);
  const { endpoint, input } = buildFalInput(model, {
    mode,
    prompt,
    negativePrompt,
    duration,
    aspectRatio,
    withAudio,
    imageUrl,
  });

  // ---------- חיוב קרדיטים + יצירת רשומה (אטומי) ----------
  const admin = createAdminClient();
  const { data: videoId, error } = await admin.rpc("start_generation", {
    p_user: user.id,
    p_cost: cost,
    p_video: {
      prompt,
      negative_prompt: negativePrompt,
      mode,
      model: model.id,
      endpoint,
      duration,
      aspect_ratio: mode === "text" ? aspectRatio : "",
      with_audio: withAudio,
      input_image_url: imageUrl ?? "",
      is_public: isPublic,
    },
  });

  if (error || !videoId) {
    if (error?.message?.includes("INSUFFICIENT_CREDITS")) {
      return NextResponse.json(
        { error: "אין לך מספיק קרדיטים", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    console.error("start_generation failed", error);
    return bad("שגיאה ביצירת הבקשה", 500);
  }

  // ---------- שליחה לתור של fal ----------
  try {
    const webhookUrl = falWebhookUrl(videoId as string);
    const { request_id } = await fal.queue.submit(endpoint, {
      input,
      ...(webhookUrl ? { webhookUrl } : {}),
    });

    await admin
      .from("videos")
      .update({ fal_request_id: request_id, status: "processing" })
      .eq("id", videoId);

    return NextResponse.json({ id: videoId, cost });
  } catch (e) {
    console.error("fal submit failed", e);
    await admin.rpc("fail_video", { p_video: videoId, p_error: `שליחה ל-fal נכשלה: ${errorMessage(e)}` });
    return bad("שירות היצירה לא זמין כרגע. הקרדיטים הוחזרו לחשבונך.", 502);
  }
}
