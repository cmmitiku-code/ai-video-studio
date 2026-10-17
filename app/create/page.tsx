import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MY_COLUMNS, type VideoRow } from "@/lib/types";
import CreateForm from "@/components/CreateForm";
import MyVideos from "@/components/MyVideos";

export const dynamic = "force-dynamic";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/create");

  const [{ data: profile }, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user.id).single(),
    supabase
      .from("videos")
      .select(MY_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[440px_1fr]">
      <CreateForm
        userId={user.id}
        credits={profile?.credits ?? 0}
        initialPrompt={sp.prompt ?? ""}
        initialMode={sp.mode === "image" ? "image" : "text"}
      />
      <section className="min-w-0">
        <h2 className="mb-3 text-lg font-bold">היצירות האחרונות שלך</h2>
        <MyVideos initial={(recent ?? []) as VideoRow[]} compact />
      </section>
    </div>
  );
}
