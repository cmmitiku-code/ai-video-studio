"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

function translate(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "אימייל או סיסמה שגויים";
  if (/already registered|already been registered/i.test(msg)) return "כתובת המייל כבר רשומה – נסו להתחבר";
  if (/password should be at least/i.test(msg)) return "הסיסמה חייבת להכיל לפחות 6 תווים";
  if (/email not confirmed/i.test(msg)) return "יש לאשר את כתובת המייל דרך הקישור שנשלח אליכם";
  if (/rate limit/i.test(msg)) return "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות";
  if (/valid email|invalid email/i.test(msg)) return "כתובת מייל לא תקינה";
  return msg;
}

export default function LoginForm({
  next,
  initialMode,
  authError,
}: {
  next: string;
  initialMode: Mode;
  authError: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(authError ? "ההתחברות נכשלה, נסו שוב" : null);
  const [info, setInfo] = useState<string | null>(null);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() || undefined }, emailRedirectTo: callback() },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("שלחנו לכם מייל לאימות. לחצו על הקישור שבו כדי להשלים את ההרשמה.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(translate(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback() },
    });
    if (error) setError(translate(error.message));
  }

  return (
    <div className="w-full rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold">{mode === "signup" ? "יוצרים חשבון" : "ברוכים השבים"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "signup" ? "קבלו 20 קרדיטים מתנה ליצירה הראשונה 🎁" : "התחברו כדי להמשיך ליצור"}
      </p>

      <div className="mt-6 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 font-medium transition ${mode === m ? "bg-bg text-white" : "text-muted"}`}
          >
            {m === "signin" ? "התחברות" : "הרשמה"}
          </button>
        ))}
      </div>

      <button onClick={google} className="btn-ghost mt-5 w-full py-2.5">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        המשך עם Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> או עם אימייל <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input className="field" placeholder="שם (יוצג בגלריה)" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input
          className="field ltr text-right"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="field ltr text-right"
          type="password"
          required
          minLength={6}
          placeholder="סיסמה"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {info && <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{info}</p>}

        <button disabled={busy} className="btn-brand mt-1 py-3 text-base">
          {busy ? "רגע…" : mode === "signup" ? "הרשמה" : "התחברות"}
        </button>
      </form>
    </div>
  );
}
