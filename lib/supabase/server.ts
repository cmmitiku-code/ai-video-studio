import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** לקוח Supabase בהקשר המשתמש המחובר (כפוף ל-RLS) */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // נקרא מתוך Server Component – ה-middleware מרענן את הסשן במקום
          }
        },
      },
    }
  );
}
