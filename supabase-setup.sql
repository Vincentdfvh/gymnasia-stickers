-- ============================================================
--  Gymnasia Stickers — à coller dans Supabase > SQL Editor > New query > Run
--  ⚠️  Change le code du club ci-dessous AVANT de lancer (ligne CODE_DU_CLUB).
-- ============================================================

-- Code secret demandé quand on ajoute / modifie quelque chose.
create schema if not exists private;
create table if not exists private.club (code text not null);
delete from private.club;
insert into private.club (code) values ('CODE_DU_CLUB');   -- <<< change-le ici

create or replace function public.club_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.club c
    where c.code = coalesce(current_setting('request.headers', true)::json ->> 'x-club-code', '')
  );
$$;
grant execute on function public.club_ok() to anon, authenticated;

-- Membres
create table if not exists public.people (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(name) between 1 and 40),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);

-- Stickers (la photo est stockée en JPEG compressé, en data URL)
create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  person_id text not null references public.people(id),
  iso text not null,
  country text not null,
  continent text,
  place text not null check (length(place) <= 120),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  approx boolean not null default false,
  alt integer,
  summit boolean not null default false,
  photo text check (photo is null or (photo like 'data:image/%' and length(photo) < 1500000)),
  has_photo boolean generated always as (photo is not null) stored,
  created_at timestamptz not null default now()
);

-- Tout le monde peut lire ; il faut le code du club pour écrire.
alter table public.people enable row level security;
alter table public.stickers enable row level security;

drop policy if exists "lecture" on public.people;
drop policy if exists "ajout" on public.people;
drop policy if exists "modif" on public.people;
create policy "lecture" on public.people for select using (true);
create policy "ajout"   on public.people for insert with check (public.club_ok());
create policy "modif"   on public.people for update using (public.club_ok()) with check (public.club_ok());

drop policy if exists "lecture" on public.stickers;
drop policy if exists "ajout" on public.stickers;
drop policy if exists "modif" on public.stickers;
drop policy if exists "suppression" on public.stickers;
create policy "lecture"     on public.stickers for select using (true);
create policy "ajout"       on public.stickers for insert with check (public.club_ok());
create policy "modif"       on public.stickers for update using (public.club_ok()) with check (public.club_ok());
create policy "suppression" on public.stickers for delete using (public.club_ok());

-- Données de départ
insert into public.people (id, name, color, created_at) values
  ('jules', 'Jules', '#ff6b6b', now() + interval '0 seconds'),
  ('darius', 'Darius', '#ffb347', now() + interval '1 seconds'),
  ('lemi', 'Lemi', '#ffe066', now() + interval '2 seconds'),
  ('vincent', 'Vincent', '#4ade80', now() + interval '3 seconds'),
  ('giacomo', 'Giacomo', '#38bdf8', now() + interval '4 seconds'),
  ('anton', 'Anton', '#a78bfa', now() + interval '5 seconds'),
  ('tristan', 'Tristan Sidj', '#f472b6', now() + interval '6 seconds'),
  ('club', 'Le club', '#e5e7eb', now() + interval '7 seconds')
on conflict (id) do nothing;

insert into public.stickers (person_id, iso, country, continent, place, lat, lng, approx, alt, summit, created_at)
select * from (values
  ('club', '756', 'Suisse', 'Europe', 'Le QG', 46.80, 8.23, true, null, false, now() + interval '0 seconds'),
  ('jules', '276', 'Allemagne', 'Europe', 'Allemagne', 51.17, 10.45, true, null, false, now() + interval '1 seconds'),
  ('jules', '818', 'Égypte', 'Afrique', 'Égypte', 26.82, 30.80, true, null, false, now() + interval '2 seconds'),
  ('jules', '752', 'Suède', 'Europe', 'Au cercle polaire', 66.56, 19.80, false, null, false, now() + interval '3 seconds'),
  ('jules', '578', 'Norvège', 'Europe', 'Norvège', 61.50, 9.50, true, null, false, now() + interval '4 seconds'),
  ('darius', '364', 'Iran', 'Asie', 'Iran', 32.43, 53.69, true, null, false, now() + interval '5 seconds'),
  ('darius', '480', 'Île Maurice', 'Afrique', 'Île Maurice', -20.25, 57.55, true, null, false, now() + interval '6 seconds'),
  ('darius', '250', 'France', 'Europe', 'France', 46.60, 2.40, true, null, false, now() + interval '7 seconds'),
  ('lemi', '276', 'Allemagne', 'Europe', 'Allemagne', 50.20, 8.60, true, null, false, now() + interval '8 seconds'),
  ('vincent', '076', 'Brésil', 'Amérique du Sud', 'Sur la plage et dans le village de hippies (avec Toma)', -14.2, -45.0, true, null, false, now() + interval '9 seconds'),
  ('vincent', '152', 'Chili', 'Amérique du Sud', 'Chili', -33.45, -70.67, true, null, false, now() + interval '10 seconds'),
  ('vincent', '604', 'Pérou', 'Amérique du Sud', 'Vinicunca (montagne arc-en-ciel)', -13.87, -71.30, false, 5036, true, now() + interval '11 seconds'),
  ('giacomo', '380', 'Italie', 'Europe', 'Italie', 42.80, 12.50, true, null, false, now() + interval '12 seconds'),
  ('anton', '392', 'Japon', 'Asie', 'Tokyo', 35.68, 139.69, false, null, false, now() + interval '13 seconds'),
  ('anton', '392', 'Japon', 'Asie', 'Osaka', 34.69, 135.50, false, null, false, now() + interval '14 seconds'),
  ('anton', '410', 'Corée du Sud', 'Asie', 'Séoul', 37.57, 126.98, false, null, false, now() + interval '15 seconds'),
  ('anton', '620', 'Portugal', 'Europe', 'Lisbonne', 38.72, -9.14, false, null, false, now() + interval '16 seconds'),
  ('tristan', '124', 'Canada', 'Amérique du Nord', 'Montréal', 45.50, -73.57, false, null, false, now() + interval '17 seconds'),
  ('tristan', '840', 'USA', 'Amérique du Nord', 'USA', 39.80, -98.60, true, null, false, now() + interval '18 seconds')
) as v(person_id, iso, country, continent, place, lat, lng, approx, alt, summit, created_at)
where not exists (select 1 from public.stickers);
