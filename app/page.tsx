import { createClient } from "@/lib/supabase/server";
import { FEED_COLUMNS, type FeedVideo } from "@/lib/types";
import FeedGrid from "@/components/FeedGrid";
import PromptHero from "@/components/PromptHero";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select(FEED_COLUMNS)
    .eq("status", "completed")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  return (
    <div className="mx-auto max-w-[1800px] px-4 pb-20">
      <PromptHero />
      <div className="mb-4 mt-2 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold">השראה מהקהילה</h2>
          <p className="text-sm text-muted">רחפו מעל סרטון כדי לנגן · לחצו לפרטים ולפרומפט</p>
        </div>
      </div>
      <FeedGrid initial={(data ?? []) as FeedVideo[]} pageSize={PAGE_SIZE} />
    </div>
  );
}
