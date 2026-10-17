import { NextResponse, type NextRequest } from "next/server";
import { markCompleted, markFailed } from "@/lib/sync";

export const runtime = "nodejs";

interface FalWebhookBody {
  request_id?: string;
  status?: "OK" | "ERROR";
  payload?: { video?: { url?: string } } | null;
  error?: string | null;
  payload_error?: string | null;
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const videoId = req.nextUrl.searchParams.get("video");

  if (!process.env.FAL_WEBHOOK_SECRET || secret !== process.env.FAL_WEBHOOK_SECRET || !videoId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as FalWebhookBody | null;
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const url = body.payload?.video?.url;
  if (body.status === "OK" && url) {
    await markCompleted(videoId, url);
  } else {
    await markFailed(videoId, body.error || body.payload_error || "היצירה נכשלה");
  }

  return NextResponse.json({ ok: true });
}
