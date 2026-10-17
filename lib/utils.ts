import { getModel } from "./models";

/** מונע open-redirect: מאפשר רק נתיבים פנימיים */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export function aspectClass(ratio: string | null | undefined) {
  switch (ratio) {
    case "9:16":
      return "aspect-[9/16]";
    case "1:1":
      return "aspect-square";
    case "16:9":
      return "aspect-video";
    default:
      return "";
  }
}

export function modelName(id: string) {
  return getModel(id)?.name ?? id;
}

const rtf = new Intl.RelativeTimeFormat("he", { numeric: "auto" });

export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return "עכשיו";
}

export function errorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "שגיאה לא ידועה";
  }
}
