-- Wilds Forge: community builds and outfits on Supabase.
-- Run this whole file once in Supabase > SQL Editor > New query.
--
-- Visitors (anon key) can only READ through the `builds_public` view.
-- Every write goes through the functions below, which validate the input and
-- check the secret edit token returned at publication (stored hashed).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- Tables
create table if not exists public.builds (
  id          text primary key default encode(gen_random_bytes(6), 'hex'),
  type        text not null default 'build' check (type in ('build', 'cosmetic')),
  token_hash  text not null,
  name        text not null check (char_length(name) between 1 and 60),
  author      text check (char_length(author) <= 32),
  description text check (char_length(description) <= 1000),
  weapon_kind text check (char_length(weapon_kind) <= 30),
  playstyle   text not null default 'custom'
              check (playstyle in ('aggressive', 'defensive', 'technical', 'support', 'status', 'balanced', 'beginner', 'custom')),
  hr          integer check (hr between 1 and 999),
  rank        text check (rank in ('low', 'high')),
  lang        text not null default 'fr' check (lang in ('fr', 'en')),
  data        jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 8192),
  likes       integer not null default 0,
  views       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists builds_type_created on public.builds (type, created_at desc);
create index if not exists builds_type_likes on public.builds (type, likes desc);

create table if not exists public.build_likes (
  build_id text not null references public.builds (id) on delete cascade,
  voter    text not null check (voter ~ '^[A-Za-z0-9_-]{8,64}$'),
  primary key (build_id, voter)
);

-- Nobody accesses the tables directly: reads use the view, writes use the functions.
alter table public.builds enable row level security;
alter table public.build_likes enable row level security;
revoke all on public.builds, public.build_likes from anon, authenticated;

-- ---------------------------------------------------------------- Public read view (no token hash)
create or replace view public.builds_public with (security_invoker = false) as
  select id, type, name, author, description, weapon_kind, playstyle, hr, rank, lang, data,
         likes, views, created_at, updated_at
  from public.builds;
grant select on public.builds_public to anon, authenticated;

-- ---------------------------------------------------------------- Helpers
create or replace function public._clean(v text, max_len int) returns text
language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(v, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), max_len), '')
$$;

-- Simple anti-spam: at most 20 publications per hour overall from the same voter id.
create table if not exists public.publish_log (
  voter text not null,
  at    timestamptz not null default now()
);
alter table public.publish_log enable row level security;
revoke all on public.publish_log from anon, authenticated;

-- ---------------------------------------------------------------- Write functions
create or replace function public.publish_build(p jsonb, p_voter text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_id text;
begin
  if p_voter !~ '^[A-Za-z0-9_-]{8,64}$' then raise exception 'Invalid voter id'; end if;
  if (select count(*) from publish_log where voter = p_voter and at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many publications, try again later';
  end if;
  if _clean(p->>'name', 60) is null then raise exception 'A build name is required'; end if;
  insert into builds (type, token_hash, name, author, description, weapon_kind, playstyle, hr, rank, lang, data)
  values (
    coalesce(nullif(p->>'type', ''), 'build'),
    encode(digest(v_token, 'sha256'), 'hex'),
    _clean(p->>'name', 60), _clean(p->>'author', 32), _clean(p->>'description', 1000),
    _clean(p->>'weaponKind', 30), coalesce(nullif(p->>'playstyle', ''), 'custom'),
    least(greatest(coalesce((p->>'hr')::int, 1), 1), 999),
    case when p->>'rank' = 'high' then 'high' else 'low' end,
    case when p->>'lang' = 'en' then 'en' else 'fr' end,
    p->'build'
  ) returning id into v_id;
  insert into publish_log (voter) values (p_voter);
  delete from publish_log where at < now() - interval '1 day';
  return jsonb_build_object('id', v_id, 'token', v_token);
end $$;

create or replace function public.update_build(p_id text, p_token text, p jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if _clean(p->>'name', 60) is null then raise exception 'A build name is required'; end if;
  update builds set
    name = _clean(p->>'name', 60), author = _clean(p->>'author', 32), description = _clean(p->>'description', 1000),
    weapon_kind = _clean(p->>'weaponKind', 30), playstyle = coalesce(nullif(p->>'playstyle', ''), 'custom'),
    hr = least(greatest(coalesce((p->>'hr')::int, 1), 1), 999),
    rank = case when p->>'rank' = 'high' then 'high' else 'low' end,
    lang = case when p->>'lang' = 'en' then 'en' else 'fr' end,
    data = p->'build', updated_at = now()
  where id = p_id and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'Forbidden'; end if;
  return jsonb_build_object('id', p_id);
end $$;

create or replace function public.delete_build(p_id text, p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from builds where id = p_id and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'Forbidden'; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.toggle_like(p_id text, p_voter text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_liked boolean; v_likes int;
begin
  if p_voter !~ '^[A-Za-z0-9_-]{8,64}$' then raise exception 'Invalid voter id'; end if;
  if not exists (select 1 from builds where id = p_id) then raise exception 'Build not found'; end if;
  if exists (select 1 from build_likes where build_id = p_id and voter = p_voter) then
    delete from build_likes where build_id = p_id and voter = p_voter; v_liked := false;
  else
    insert into build_likes (build_id, voter) values (p_id, p_voter); v_liked := true;
  end if;
  update builds set likes = (select count(*) from build_likes where build_id = p_id) where id = p_id
    returning likes into v_likes;
  return jsonb_build_object('liked', v_liked, 'likes', v_likes);
end $$;

create or replace function public.view_build(p_id text)
returns void language sql security definer set search_path = public, extensions as $$
  update builds set views = views + 1 where id = p_id
$$;

create or replace function public.liked_ids(p_voter text, p_ids text[])
returns text[] language sql stable security definer set search_path = public, extensions as $$
  select coalesce(array_agg(build_id), '{}') from build_likes where voter = p_voter and build_id = any(p_ids)
$$;

revoke all on function public.publish_build(jsonb, text), public.update_build(text, text, jsonb),
  public.delete_build(text, text), public.toggle_like(text, text), public.view_build(text),
  public.liked_ids(text, text[]), public._clean(text, int) from public;
grant execute on function public.publish_build(jsonb, text), public.update_build(text, text, jsonb),
  public.delete_build(text, text), public.toggle_like(text, text), public.view_build(text),
  public.liked_ids(text, text[]) to anon, authenticated;
