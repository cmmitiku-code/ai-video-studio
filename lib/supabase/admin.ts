import { createClient } from "@supabase/supabase-js";

/**
 * לקוח עם service role – עוקף RLS. לשימוש בצד שרת בלבד
 * (API routes / webhooks). לעולם לא לייבא מקומפוננטת client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
