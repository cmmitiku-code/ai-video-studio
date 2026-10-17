import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MY_COLUMNS, type VideoRow } from "@/lib/types";
import MyVideos from "@/components/MyVideos";

export const dynamic = "force-dynamic";

export default async function MyVideosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my");

  const { data } = await supabase
    .from("videos")
    .select(MY_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">הסרטונים שלי</h1>
        <Link href="/create" className="btn-brand">
          + יצירה חדשה
        </Link>
      </div>
      <MyVideos initial={(data ?? []) as VideoRow[]} />
    </div>
  );
}
