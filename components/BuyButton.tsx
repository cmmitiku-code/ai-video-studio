"use client";

import { useState } from "react";
import Link from "next/link";

export default function BuyButton({
  packId,
  loggedIn,
  highlight,
}: {
  packId: string;
  loggedIn: boolean;
  highlight?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cls = `${highlight ? "btn-brand" : "btn-ghost"} mt-6 w-full py-3`;

  if (!loggedIn) {
    return (
      <Link href="/login?mode=signup&next=/pricing" className={cls}>
        הרשמה ורכישה
      </Link>
    );
  }

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "לא הצלחנו לפתוח את דף התשלום");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={buy} disabled={busy} className={cls}>
        {busy ? "מעביר לתשלום…" : "לרכישה"}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-300">{error}</p>}
    </>
  );
}
