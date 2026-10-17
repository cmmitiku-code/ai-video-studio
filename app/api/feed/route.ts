import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FEED_COLUMNS } from "@/lib/types";

export async function GET(req: NextRequest) {
  const before = req.nextUrl.searchParams.get("before");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 30, 60);

  const supabase = await createClient();
  let query = supabase
    .from("videos")
    .select(FEED_COLUMNS)
    .eq("status", "completed")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
