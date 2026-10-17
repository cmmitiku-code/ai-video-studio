"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const IDEAS = [
  "שועל אדום רץ ביער מושלג בשקיעה, צילום קולנועי איטי",
  "רחוב ניאון בטוקיו בגשם, מצלמה מתקדמת קדימה, השתקפויות על האספלט",
  "אסטרונאוטית צפה מעל כדור הארץ, אור שמש זהוב, עדשה אנמורפית",
  "גל ענק מתנפץ על צוקים, הילוך איטי, טיפות במים בתקריב",
];

export default function PromptHero() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  const go = (p = prompt) => {
    const q = p.trim() ? `?prompt=${encodeURIComponent(p.trim())}` : "";
    router.push(`/create${q}`);
  };

  return (
    <section className="relative my-6 overflow-hidden rounded-3xl border border-line bg-surface px-5 py-10 sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
      <div className="relative mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
          הפכו מילים <span className="text-brand">לתנועה</span>
        </h1>
        <p className="mt-3 text-muted sm:text-lg">
          כתבו מה אתם רוצים לראות, או העלו תמונה – וקבלו סרטון קולנועי תוך דקות.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          className="mt-7 flex flex-col gap-2 rounded-2xl border border-line bg-bg/70 p-2 sm:flex-row"
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="תארו את הסצנה שלכם…"
            className="flex-1 bg-transparent px-3 py-3 text-base outline-none placeholder:text-zinc-500"
          />
          <button className="btn-brand px-6 py-3 text-base">צרו סרטון</button>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              onClick={() => go(idea)}
              className="max-w-full truncate rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs text-zinc-300 hover:border-brand/40 hover:text-white"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
