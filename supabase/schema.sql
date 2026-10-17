-- =====================================================================
--  סכמת מסד הנתונים – הריצו פעם אחת ב-Supabase → SQL Editor
-- =====================================================================

-- ---------- פרופילים + יתרת קרדיטים ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text,
  credits       integer not null default 0 check (credits >= 0),
  created_at    timestamptz not null default now()
);

-- ---------- סרטונים ----------
create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  author_name      text,
  prompt           text not null,
  negative_prompt  text,
  mode             text not null check (mode in ('text', 'image')),
  model            text not null,
  endpoint         text not null,
  duration         integer not null,
  aspect_ratio     text,
  with_audio       boolean not null default false,
  input_image_url  text,
  status           text not null default 'queued'
                   check (status in ('queued', 'processing', 'completed', 'failed')),
  fal_request_id   text unique,
  video_url        text,
  error            text,
  credits_cost     integer not null,
  is_public        boolean not null default true,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index if not exists videos_feed_idx on public.videos (created_at desc) where status = 'completed' and is_public;
create index if not exists videos_user_idx on public.videos (user_id, created_at desc);

-- ---------- יומן תנועות קרדיטים ----------
create table if not exists public.credit_transactions (
  id                 bigserial primary key,
  user_id            uuid not null references auth.users on delete cascade,
  amount             integer not null,           -- חיובי = זיכוי, שלילי = חיוב
  reason             text not null check (reason in ('signup', 'purchase', 'generation', 'refund', 'admin')),
  video_id           uuid references public.videos on delete set null,
  stripe_session_id  text unique,                -- מונע זיכוי כפול מאותו תשלום
  created_at         timestamptz not null default now()
);
create index if not exists credit_tx_user_idx on public.credit_transactions (user_id, created_at desc);

-- =====================================================================
--  קרדיטים מתנה בהרשמה (שנו את 20 למספר שתרצו)
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_free int := 20;
begin
  insert into public.profiles (id, display_name, credits)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    v_free
  );
  insert into public.credit_transactions (user_id, amount, reason) values (new.id, v_free, 'signup');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  פעולות אטומיות (נקראות רק מהשרת עם service role)
-- =====================================================================

-- חיוב קרדיטים + יצירת רשומת וידאו בטרנזקציה אחת
create or replace function public.start_generation(p_user uuid, p_cost int, p_video jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id   uuid;
  v_name text;
begin
  if p_cost <= 0 then raise exception 'INVALID_COST'; end if;

  update public.profiles
     set credits = credits - p_cost
   where id = p_user and credits >= p_cost
  returning display_name into v_name;

  if not found then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.videos (
    user_id, author_name, prompt, negative_prompt, mode, model, endpoint,
    duration, aspect_ratio, with_audio, input_image_url, credits_cost, is_public
  ) values (
    p_user, v_name,
    p_video->>'prompt',
    nullif(p_video->>'negative_prompt', ''),
    p_video->>'mode',
    p_video->>'model',
    p_video->>'endpoint',
    (p_video->>'duration')::int,
    nullif(p_video->>'aspect_ratio', ''),
    coalesce((p_video->>'with_audio')::boolean, false),
    nullif(p_video->>'input_image_url', ''),
    p_cost,
    coalesce((p_video->>'is_public')::boolean, true)
  ) returning id into v_id;

  insert into public.credit_transactions (user_id, amount, reason, video_id)
  values (p_user, -p_cost, 'generation', v_id);

  return v_id;
end $$;

-- סימון כישלון + החזר קרדיטים (אידמפוטנטי – מחזיר פעם אחת בלבד)
create or replace function public.fail_video(p_video uuid, p_error text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_cost int;
begin
  update public.videos
     set status = 'failed', error = left(coalesce(p_error, 'unknown error'), 1000), completed_at = now()
   where id = p_video and status in ('queued', 'processing')
  returning user_id, credits_cost into v_user, v_cost;

  if not found then return false; end if;

  update public.profiles set credits = credits + v_cost where id = v_user;
  insert into public.credit_transactions (user_id, amount, reason, video_id)
  values (v_user, v_cost, 'refund', p_video);
  return true;
end $$;

-- זיכוי מרכישה ב-Stripe (אידמפוטנטי לפי session id)
create or replace function public.add_purchase_credits(p_user uuid, p_amount int, p_session text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  insert into public.credit_transactions (user_id, amount, reason, stripe_session_id)
  values (p_user, p_amount, 'purchase', p_session)
  on conflict (stripe_session_id) do nothing
  returning id into v_id;

  if v_id is null then return false; end if;

  update public.profiles set credits = credits + p_amount where id = p_user;
  return true;
end $$;

revoke execute on function public.start_generation(uuid, int, jsonb)    from public, anon, authenticated;
revoke execute on function public.fail_video(uuid, text)                from public, anon, authenticated;
revoke execute on function public.add_purchase_credits(uuid, int, text) from public, anon, authenticated;
grant  execute on function public.start_generation(uuid, int, jsonb)    to service_role;
grant  execute on function public.fail_video(uuid, text)                to service_role;
grant  execute on function public.add_purchase_credits(uuid, int, text) to service_role;

-- =====================================================================
--  Row Level Security – משתמשים רק קוראים; כל הכתיבה דרך השרת
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.videos              enable row level security;
alter table public.credit_transactions enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "videos: public feed or own" on public.videos;
create policy "videos: public feed or own" on public.videos
  for select using ((is_public and status = 'completed') or auth.uid() = user_id);

drop policy if exists "credit_tx: read own" on public.credit_transactions;
create policy "credit_tx: read own" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- =====================================================================
--  Storage – תמונות קלט ל-image-to-video (כל משתמש מעלה רק לתיקייה שלו)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inputs', 'inputs', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "inputs: upload to own folder" on storage.objects;
create policy "inputs: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inputs' and (storage.foldername(name))[1] = auth.uid()::text);
