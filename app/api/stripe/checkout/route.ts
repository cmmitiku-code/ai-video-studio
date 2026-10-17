import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { CURRENCY, getPack } from "@/lib/credits";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });

  const { packId } = (await req.json().catch(() => ({}))) as { packId?: string };
  const pack = getPack(packId);
  if (!pack) return NextResponse.json({ error: "חבילה לא קיימת" }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: pack.priceAgorot,
          product_data: {
            name: `${pack.credits} קרדיטים – חבילת ${pack.name}`,
            description: "קרדיטים ליצירת סרטוני AI",
          },
        },
      },
    ],
    metadata: { user_id: user.id, credits: String(pack.credits), pack_id: pack.id },
    success_url: `${origin}/pricing?success=1`,
    cancel_url: `${origin}/pricing?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
