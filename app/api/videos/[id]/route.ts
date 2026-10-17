import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncVideo } from "@/lib/sync";
import { MY_COLUMNS, type VideoRow } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnVideo(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, video: null };
  const { data } = await createAdminClient()
    .from("videos")
    .select(MY_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  return { user, video: data as VideoRow | null };
}

/** סטטוס עדכני (כולל בדיקה מול fal אם הסרטון עדיין בעבודה) */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, video } = await getOwnVideo(id);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!video) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(await syncVideo(video));
}

/** הפיכה לציבורי / פרטי */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, video } = await getOwnVideo(id);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!video) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { isPublic?: boolean };
  const { data } = await createAdminClient()
    .from("videos")
    .update({ is_public: Boolean(body.isPublic) })
    .eq("id", id)
    .select(MY_COLUMNS)
    .single();
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { user, video } = await getOwnVideo(id);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!video) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (video.status === "queued" || video.status === "processing") {
    return NextResponse.json({ error: "אי אפשר למחוק סרטון שעדיין בעבודה" }, { status: 409 });
  }
  await createAdminClient().from("videos").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
