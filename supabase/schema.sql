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

-- Accounts (optional): builds published while signed in belong to the account.
alter table public.builds add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists builds_user on public.builds (user_id);

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

-- Name typed by a visitor who is not signed in; registered usernames are reserved.
-- (profiles is created further down; this function only resolves it when called.)
create or replace function public._guest_author(v text) returns text
language plpgsql stable security definer set search_path = public as $$
declare a text := _clean(v, 32);
begin
  if a is not null and to_regclass('public.profiles') is not null
     and exists (select 1 from profiles where lower(username) = lower(a)) then
    return null;
  end if;
  return a;
end $$;
revoke all on function public._guest_author(text) from public;

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
  insert into builds (type, token_hash, user_id, name, author, description, weapon_kind, playstyle, hr, rank, lang, data)
  values (
    coalesce(nullif(p->>'type', ''), 'build'),
    encode(digest(v_token, 'sha256'), 'hex'),
    auth.uid(),
    _clean(p->>'name', 60),
    coalesce((select username from profiles where id = auth.uid()), _guest_author(p->>'author')),
    _clean(p->>'description', 1000),
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
    name = _clean(p->>'name', 60),
    author = coalesce((select username from profiles where id = builds.user_id), _guest_author(p->>'author')),
    description = _clean(p->>'description', 1000),
    weapon_kind = _clean(p->>'weaponKind', 30), playstyle = coalesce(nullif(p->>'playstyle', ''), 'custom'),
    hr = least(greatest(coalesce((p->>'hr')::int, 1), 1), 999),
    rank = case when p->>'rank' = 'high' then 'high' else 'low' end,
    lang = case when p->>'lang' = 'en' then 'en' else 'fr' end,
    data = p->'build', updated_at = now()
  where id = p_id and (token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
                       or (auth.uid() is not null and user_id = auth.uid()));
  if not found then raise exception 'Forbidden'; end if;
  return jsonb_build_object('id', p_id);
end $$;

create or replace function public.delete_build(p_id text, p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from builds where id = p_id and (token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
                                          or (auth.uid() is not null and user_id = auth.uid()));
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

-- ================================================================ Accounts
-- Visitors can create an account (Supabase Auth, email + password). Each account
-- has a public username, its own favorites and the builds it published.

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null check (username ~ '^[A-Za-z0-9_-]{3,24}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_ci on public.profiles (lower(username));
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles for select to authenticated using (id = auth.uid());

-- Profile created with the account; a taken or invalid username gets a numeric suffix.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  base text := left(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^A-Za-z0-9_-]', '', 'g'), 20);
  candidate text;
  n int := 0;
begin
  if char_length(base) < 3 then base := 'hunter'; end if;
  candidate := base;
  while exists (select 1 from profiles where lower(username) = lower(candidate)) loop
    n := n + 1;
    candidate := base || floor(random() * 9000 + 1000)::int;
    exit when n > 20;
  end loop;
  insert into profiles (id, username) values (new.id, candidate);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_username ~ '^[A-Za-z0-9_-]{3,24}$'
     and not exists (select 1 from profiles where lower(username) = lower(p_username))
$$;

create or replace function public.update_username(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_username !~ '^[A-Za-z0-9_-]{3,24}$' then raise exception 'Invalid username'; end if;
  if exists (select 1 from profiles where lower(username) = lower(p_username) and id <> auth.uid()) then
    raise exception 'Username already taken';
  end if;
  update profiles set username = p_username where id = auth.uid();
  update builds set author = p_username where user_id = auth.uid();
  return jsonb_build_object('username', p_username);
end $$;

-- Favorites stored on the account (snapshot of the build, so they also work offline).
create table if not exists public.favorites (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fav_id   text not null check (char_length(fav_id) <= 200),
  entry    jsonb not null check (pg_column_size(entry) < 16384),
  saved_at timestamptz not null default now(),
  primary key (user_id, fav_id)
);
alter table public.favorites enable row level security;
revoke all on public.favorites from anon, authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Builds of the signed-in account.
create or replace function public.my_builds()
returns setof public.builds_public language sql stable security definer set search_path = public as $$
  select id, type, name, author, description, weapon_kind, playstyle, hr, rank, lang, data,
         likes, views, created_at, updated_at
  from builds where user_id = auth.uid() order by created_at desc
$$;

-- True when the build belongs to the signed-in account.
create or replace function public.owns_build(p_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from builds where id = p_id and user_id = auth.uid() and auth.uid() is not null)
$$;

-- Attach builds published anonymously from this browser (proved by their edit tokens).
create or replace function public.claim_builds(p_ids text[], p_tokens text[])
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare n int := 0; i int;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  for i in 1 .. least(coalesce(array_length(p_ids, 1), 0), 200) loop
    update builds set user_id = auth.uid(), author = coalesce((select username from profiles where id = auth.uid()), author)
    where id = p_ids[i] and user_id is null
      and token_hash = encode(digest(coalesce(p_tokens[i], ''), 'sha256'), 'hex');
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- Lets a visitor delete their account; their builds stay public without an owner.
create or replace function public.delete_my_account()
returns jsonb language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  delete from auth.users where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.username_available(text), public.update_username(text), public.my_builds(),
  public.owns_build(text), public.claim_builds(text[], text[]), public.delete_my_account(),
  public.handle_new_user() from public;
grant execute on function public.username_available(text), public.owns_build(text) to anon, authenticated;
grant execute on function public.update_username(text), public.my_builds(), public.claim_builds(text[], text[]),
  public.delete_my_account() to authenticated;
