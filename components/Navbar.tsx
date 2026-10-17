import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavLinks from "./NavLinks";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let credits = 0;
  if (user) {
    const { data } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
    credits = data?.credits ?? 0;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-ink">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          תנועה
        </Link>

        <NavLinks className="hidden md:flex" loggedIn={!!user} />

        <div className="ms-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/pricing"
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:border-brand/50"
                title="הקרדיטים שלך – לחצו לרכישה"
              >
                <span className="text-brand">⚡</span>
                <span className="font-bold">{credits.toLocaleString("he-IL")}</span>
                <span className="hidden text-muted sm:inline">קרדיטים</span>
              </Link>
              <Link href="/create" className="btn-brand hidden sm:inline-flex">
                + צור וידאו
              </Link>
              <form action="/auth/signout" method="post">
                <button className="px-2 text-sm text-muted hover:text-white">יציאה</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 text-sm text-zinc-300 hover:text-white">
                התחברות
              </Link>
              <Link href="/login?mode=signup" className="btn-brand">
                הרשמה חינם
              </Link>
            </>
          )}
        </div>
      </div>
      <NavLinks className="flex overflow-x-auto px-3 pb-2 md:hidden" loggedIn={!!user} />
    </header>
  );
}
