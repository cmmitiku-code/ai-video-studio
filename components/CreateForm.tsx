"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ASPECT_RATIOS,
  DEFAULT_MODEL_ID,
  MODELS,
  calcCost,
  getModel,
  type AspectRatio,
  type GenerationMode,
} from "@/lib/models";

const MAX_IMAGE_MB = 10;
const MAX_PROMPT = 2500;

export default function CreateForm({
  userId,
  credits,
  initialPrompt,
  initialMode,
}: {
  userId: string;
  credits: number;
  initialPrompt: string;
  initialMode: GenerationMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<GenerationMode>(initialMode);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negative, setNegative] = useState("");
  const [showNegative, setShowNegative] = useState(false);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [duration, setDuration] = useState(5);
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [withAudio, setWithAudio] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; credits?: boolean } | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const model = getModel(modelId)!;
  const cost = useMemo(() => calcCost(model, duration, withAudio), [model, duration, withAudio]);
  const enough = credits >= cost;

  useEffect(() => {
    if (!model.durations.includes(duration)) setDuration(model.durations[0]);
    if (!model.audio) setWithAudio(false);
  }, [model, duration]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(f: File | undefined | null) {
    setError(null);
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      return setError({ msg: "אפשר להעלות רק PNG, JPG או WEBP" });
    }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
      return setError({ msg: `התמונה גדולה מדי (עד ${MAX_IMAGE_MB}MB)` });
    }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (prompt.trim().length < 3) return setError({ msg: "כתבו תיאור של הסצנה (לפחות 3 תווים)" });
    if (mode === "image" && !file) return setError({ msg: "בחרו תמונה להנפשה" });
    if (!enough) return setError({ msg: "אין מספיק קרדיטים ליצירה הזו", credits: true });

    setBusy(true);
    try {
      let imageUrl: string | undefined;
      if (mode === "image" && file) {
        const supabase = createClient();
        const ext = file.type.split("/")[1].replace("jpeg", "jpg");
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("inputs")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw new Error(`העלאת התמונה נכשלה: ${upErr.message}`);
        imageUrl = supabase.storage.from("inputs").getPublicUrl(path).data.publicUrl;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          model: modelId,
          prompt: prompt.trim(),
          negativePrompt: negative.trim(),
          duration,
          aspectRatio: aspect,
          withAudio,
          imageUrl,
          isPublic,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ msg: json.error || "משהו השתבש", credits: json.code === "INSUFFICIENT_CREDITS" });
        return;
      }
      setSuccess(true);
      router.refresh(); // מרענן יתרת קרדיטים ורשימת יצירות
    } catch (err) {
      setError({ msg: err instanceof Error ? err.message : "משהו השתבש" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex h-fit flex-col gap-5 rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-20">
      {/* סוג יצירה */}
      <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm">
        {(
          [
            ["text", "טקסט ← וידאו"],
            ["image", "תמונה ← וידאו"],
          ] as const
        ).map(([m, label]) => (
          <button
            type="button"
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 font-medium transition ${mode === m ? "bg-bg text-white shadow" : "text-muted hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* העלאת תמונה */}
      {mode === "image" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInput.current?.click()}
          className="relative flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-2 text-center transition hover:border-brand/50"
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="max-h-64 w-full object-contain" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="absolute end-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs"
              >
                הסרה
              </button>
            </>
          ) : (
            <div className="p-6 text-sm text-muted">
              <div className="mb-2 text-2xl">🖼️</div>
              גררו לכאן תמונה או לחצו לבחירה
              <div className="mt-1 text-xs">PNG / JPG / WEBP · עד {MAX_IMAGE_MB}MB</div>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* פרומפט */}
      <div>
        <label className="mb-1.5 flex items-center justify-between text-sm font-medium">
          {mode === "image" ? "תארו את התנועה" : "תארו את הסצנה"}
          <span className="text-xs text-muted ltr">
            {prompt.length}/{MAX_PROMPT}
          </span>
        </label>
        <textarea
          value={prompt}
          maxLength={MAX_PROMPT}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder={
            mode === "image"
              ? "לדוגמה: המצלמה מתקרבת לאט, השיער מתנופף ברוח, הדמות מחייכת ומסובבת את הראש"
              : "לדוגמה: חתול כתום ישן על אדן חלון ביום גשום, טיפות זולגות על הזכוכית, אור רך, צילום קולנועי"
          }
          className="field resize-none leading-relaxed"
        />
        <p className="mt-1 text-xs text-muted">טיפ: המודלים מבינים עברית, אבל באנגלית מתקבלות לרוב תוצאות מדויקות יותר.</p>

        <button type="button" onClick={() => setShowNegative((s) => !s)} className="mt-2 text-xs text-muted hover:text-white">
          {showNegative ? "−" : "+"} פרומפט שלילי (מה לא להציג)
        </button>
        {showNegative && (
          <input
            value={negative}
            onChange={(e) => setNegative(e.target.value)}
            placeholder="blur, distort, low quality"
            className="field mt-2"
          />
        )}
      </div>

      {/* מודל */}
      <div>
        <p className="mb-1.5 text-sm font-medium">מודל</p>
        <div className="flex flex-col gap-2">
          {MODELS.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => setModelId(m.id)}
              className={`rounded-xl border p-3 text-start transition ${
                modelId === m.id ? "border-brand/70 bg-brand/5" : "border-line bg-surface-2 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold ltr">{m.name}</span>
                {m.badge && <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand">{m.badge}</span>}
                <span className="ms-auto text-xs text-muted">{m.creditsPerSecond} קר׳/שנ׳</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{m.tagline}</p>
            </button>
          ))}
        </div>
      </div>

      {/* הגדרות */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">משך</p>
          <div className="flex gap-2">
            {model.durations.map((d) => (
              <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>
                {d} שנ׳
              </Chip>
            ))}
          </div>
        </div>
        {mode === "text" && (
          <div>
            <p className="mb-1.5 text-sm font-medium">יחס תמונה</p>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map((a) => (
                <Chip key={a.value} active={aspect === a.value} onClick={() => setAspect(a.value)} title={a.label}>
                  <span className="ltr">{a.value}</span>
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {model.audio && (
          <Toggle checked={withAudio} onChange={setWithAudio} label={`אודיו מובנה (+${model.audioCreditsPerSecond} קר׳/שנ׳)`} />
        )}
        <Toggle checked={isPublic} onChange={setIsPublic} label="לשתף בגלריה הציבורית" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error.msg}
          {error.credits && (
            <Link href="/pricing" className="ms-1 font-bold text-brand underline">
              לרכישת קרדיטים
            </Link>
          )}
        </div>
      )}
      {success && (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
          הסרטון בדרך! הוא יופיע ברשימה תוך דקה-שתיים 🎬
        </p>
      )}

      <button disabled={busy} className="btn-brand py-3.5 text-base">
        {busy ? "שולח…" : "צור וידאו"}
        <span className="rounded-md bg-black/15 px-2 py-0.5 text-sm">⚡ {cost}</span>
      </button>
      <p className="-mt-3 text-center text-xs text-muted">
        יתרה: {credits} קרדיטים{!enough && " · "}
        {!enough && (
          <Link href="/pricing" className="text-brand underline">
            טעינה
          </Link>
        )}
      </p>
    </form>
  );
}

function Chip({
  active,
  children,
  ...rest
}: { active: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`flex-1 rounded-lg border px-2 py-2 text-sm transition ${
        active ? "border-brand/70 bg-brand/10 text-white" : "border-line bg-surface-2 text-muted hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-brand" : "bg-zinc-700"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "start-[22px]" : "start-0.5"}`}
        />
      </button>
    </label>
  );
}
