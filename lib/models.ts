// =====================================================================
//  מודלי הווידאו ב-fal.ai + תמחור בקרדיטים.
//  כדי להוסיף/להחליף מודל – משנים רק את הקובץ הזה.
//  רשימת endpoints עדכנית: https://fal.ai/explore/kling
// =====================================================================

export type GenerationMode = "text" | "image";
export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface VideoModel {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  textEndpoint: string;
  imageEndpoint: string;
  /** שם השדה שהמודל מצפה לו עבור תמונת הפתיחה */
  imageField: "image_url" | "start_image_url";
  durations: number[];
  creditsPerSecond: number;
  /** האם המודל יודע לייצר אודיו מובנה */
  audio: boolean;
  audioCreditsPerSecond: number;
}

export const MODELS: VideoModel[] = [
  {
    id: "kling-v3-pro",
    name: "Kling 3.0 Pro",
    tagline: "האיכות הגבוהה ביותר, תנועה קולנועית ואודיו מובנה",
    badge: "PRO",
    textEndpoint: "fal-ai/kling-video/v3/pro/text-to-video",
    imageEndpoint: "fal-ai/kling-video/v3/pro/image-to-video",
    imageField: "start_image_url",
    durations: [5, 10],
    creditsPerSecond: 4,
    audio: true,
    audioCreditsPerSecond: 2,
  },
  {
    id: "kling-v3-standard",
    name: "Kling 3.0 Standard",
    tagline: "איזון מצוין בין איכות למחיר",
    badge: "מומלץ",
    textEndpoint: "fal-ai/kling-video/v3/standard/text-to-video",
    imageEndpoint: "fal-ai/kling-video/v3/standard/image-to-video",
    imageField: "start_image_url",
    durations: [5, 10],
    creditsPerSecond: 3,
    audio: true,
    audioCreditsPerSecond: 1,
  },
  {
    id: "kling-v2.5-turbo",
    name: "Kling 2.5 Turbo",
    tagline: "מהיר וזול – מעולה לטיוטות ולסצנות אקשן",
    textEndpoint: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    imageEndpoint: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    imageField: "image_url",
    durations: [5, 10],
    creditsPerSecond: 2,
    audio: false,
    audioCreditsPerSecond: 0,
  },
];

export const DEFAULT_MODEL_ID = "kling-v3-standard";

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "16:9", label: "רוחבי" },
  { value: "9:16", label: "לאורך" },
  { value: "1:1", label: "ריבוע" },
];

export function getModel(id: string | null | undefined): VideoModel | undefined {
  return MODELS.find((m) => m.id === id);
}

export function calcCost(model: VideoModel, duration: number, withAudio: boolean): number {
  const audio = withAudio && model.audio ? model.audioCreditsPerSecond : 0;
  return duration * (model.creditsPerSecond + audio);
}

export interface BuildInputOptions {
  mode: GenerationMode;
  prompt: string;
  negativePrompt?: string;
  duration: number;
  aspectRatio: AspectRatio;
  withAudio: boolean;
  imageUrl?: string | null;
}

export function buildFalInput(model: VideoModel, o: BuildInputOptions) {
  const input: Record<string, unknown> = {
    prompt: o.prompt,
    duration: String(o.duration),
  };
  if (o.negativePrompt) input.negative_prompt = o.negativePrompt;

  if (o.mode === "image") {
    input[model.imageField] = o.imageUrl; // יחס התמונה נקבע לפי התמונה עצמה
  } else {
    input.aspect_ratio = o.aspectRatio;
  }

  if (model.audio) input.generate_audio = o.withAudio;

  return {
    endpoint: o.mode === "image" ? model.imageEndpoint : model.textEndpoint,
    input,
  };
}
