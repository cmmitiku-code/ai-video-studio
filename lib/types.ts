export type VideoStatus = "queued" | "processing" | "completed" | "failed";

export interface VideoRow {
  id: string;
  user_id: string;
  author_name: string | null;
  prompt: string;
  negative_prompt: string | null;
  mode: "text" | "image";
  model: string;
  endpoint: string;
  duration: number;
  aspect_ratio: string | null;
  with_audio: boolean;
  input_image_url: string | null;
  status: VideoStatus;
  fal_request_id: string | null;
  video_url: string | null;
  error: string | null;
  credits_cost: number;
  is_public: boolean;
  created_at: string;
  completed_at: string | null;
}

export type FeedVideo = Pick<
  VideoRow,
  | "id"
  | "prompt"
  | "model"
  | "mode"
  | "duration"
  | "aspect_ratio"
  | "video_url"
  | "author_name"
  | "input_image_url"
  | "created_at"
>;

export const FEED_COLUMNS =
  "id,prompt,model,mode,duration,aspect_ratio,video_url,author_name,input_image_url,created_at";

export const MY_COLUMNS =
  "id,user_id,author_name,prompt,negative_prompt,mode,model,endpoint,duration,aspect_ratio,with_audio,input_image_url,status,fal_request_id,video_url,error,credits_cost,is_public,created_at,completed_at";
