-- ============================================================
--  DAMERA COMMUNITY — ONE-TIME DATABASE SETUP
--  Where to run this:
--    Supabase dashboard -> SQL Editor -> "New query"
--    -> paste ALL of this -> click "Run"
--  It creates the posts table, security rules and the photo
--  storage bucket. Safe to run again (it won't duplicate).
-- ============================================================

-- 1) The posts table -------------------------------------------------
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  title        text not null,
  body         text not null default '',
  tag          text not null default 'Journey',
  images       jsonb not null default '[]',   -- uploaded photo URLs
  social_links jsonb not null default '[]',   -- Instagram / TikTok post URLs
  published    boolean not null default true
);

-- 2) Security rules (RLS) --------------------------------------------
--    Visitors: can only READ posts that are published = true
--    Admin (logged in): can add, edit, hide and delete posts
alter table public.posts enable row level security;

drop policy if exists "Public reads published posts" on public.posts;
create policy "Public reads published posts"
  on public.posts for select
  using (published = true);

drop policy if exists "Admin inserts posts" on public.posts;
create policy "Admin inserts posts"
  on public.posts for insert
  to authenticated
  with check (true);

drop policy if exists "Admin updates posts" on public.posts;
create policy "Admin updates posts"
  on public.posts for update
  to authenticated
  using (true);

drop policy if exists "Admin deletes posts" on public.posts;
create policy "Admin deletes posts"
  on public.posts for delete
  to authenticated
  using (true);

-- 3) Photo storage bucket --------------------------------------------
insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public reads post photos" on storage.objects;
create policy "Public reads post photos"
  on storage.objects for select
  using (bucket_id = 'post-photos');

drop policy if exists "Admin uploads photos" on storage.objects;
create policy "Admin uploads post photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-photos');

drop policy if exists "Admin removes post photos" on storage.objects;
create policy "Admin removes post photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-photos');

-- Done! Now go to Authentication -> Users -> "Add user" and create
-- your admin email + password. Then copy the Project URL and the
-- "anon public" key into  js/config.js  (see the comments at the top of that file).