import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    console.error("stripe signature check failed", e);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const userId = session.metadata?.user_id;
      const credits = Number(session.metadata?.credits);
      if (userId && credits > 0) {
        const { error } = await createAdminClient().rpc("add_purchase_credits", {
          p_user: userId,
          p_amount: credits,
          p_session: session.id,
        });
        if (error) {
          console.error("add_purchase_credits failed", error);
          // 500 => Stripe ינסה שוב מאוחר יותר; הפונקציה אידמפוטנטית
          return NextResponse.json({ error: "db error" }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
