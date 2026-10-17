import { createClient } from "@/lib/supabase/server";
import { CREDIT_PACKS, formatPrice } from "@/lib/credits";
import { MODELS, calcCost } from "@/lib/models";
import BuyButton from "@/components/BuyButton";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let credits: number | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
    credits = data?.credits ?? 0;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">קרדיטים ליצירה</h1>
        <p className="mt-2 text-muted">משלמים רק על מה שיוצרים. בלי מנוי, הקרדיטים לא פגים.</p>
        {credits !== null && (
          <p className="mt-4 inline-block rounded-full border border-line bg-surface px-4 py-1.5 text-sm">
            היתרה שלך: <b className="text-brand">⚡ {credits}</b>
          </p>
        )}
      </div>

      {sp.success && (
        <p className="mx-auto mt-6 max-w-lg rounded-xl bg-brand/10 px-4 py-3 text-center text-brand">
          התשלום התקבל, תודה! 🎉 הקרדיטים יתווספו לחשבון תוך כמה שניות (רעננו אם לא רואים).
        </p>
      )}
      {sp.canceled && (
        <p className="mx-auto mt-6 max-w-lg rounded-xl bg-surface-2 px-4 py-3 text-center text-muted">
          התשלום בוטל. לא חויבתם.
        </p>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {CREDIT_PACKS.map((p) => (
          <div
            key={p.id}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              p.popular ? "border-brand/60 bg-brand/5" : "border-line bg-surface"
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-xs font-bold text-brand-ink">
                הכי פופולרי
              </span>
            )}
            <h2 className="text-lg font-bold">{p.name}</h2>
            <p className="mt-3 text-4xl font-extrabold">{formatPrice(p.priceAgorot)}</p>
            <p className="mt-1 text-brand">⚡ {p.credits.toLocaleString("he-IL")} קרדיטים</p>
            <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm text-zinc-300">
              {p.perks.map((perk) => (
                <li key={perk}>✓ {perk}</li>
              ))}
            </ul>
            <BuyButton packId={p.id} loggedIn={!!user} highlight={p.popular} />
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-14 text-xl font-bold">כמה עולה כל סרטון?</h2>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th className="p-3 text-start font-medium">מודל</th>
              <th className="p-3 text-start font-medium">5 שניות</th>
              <th className="p-3 text-start font-medium">10 שניות</th>
              <th className="p-3 text-start font-medium">עם אודיו (5 שנ׳)</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="p-3 font-medium ltr text-right">{m.name}</td>
                <td className="p-3">⚡ {calcCost(m, 5, false)}</td>
                <td className="p-3">⚡ {calcCost(m, 10, false)}</td>
                <td className="p-3">{m.audio ? `⚡ ${calcCost(m, 5, true)}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">יצירה שנכשלה מחזירה את הקרדיטים אוטומטית.</p>
    </div>
  );
}
