-- ============================================================
--  KAIZEN COACH — ESQUEMA COMPLETO
--  Corre este archivo UNA VEZ en el SQL Editor de Supabase.
--  Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES  (una fila por cuenta de auth)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'patient' check (role in ('coach','patient')),
  name        text not null default '',
  email       text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. CLIENTS  (ficha del paciente, administrada por el coach)
--    Nota: aquí se agregan las columnas que la app usaba pero
--    NUNCA se guardaban (measures, steps_history, etc.)
-- ------------------------------------------------------------
create table if not exists public.clients (
  id                uuid primary key references auth.users(id) on delete cascade,
  coach_id          uuid references public.profiles(id) on delete set null,
  name              text not null default '',
  email             text not null,
  phone             text default '',
  age               int,
  height            numeric,
  occupation        text default '',
  goal              text default '',
  status            text not null default 'active' check (status in ('active','baja','eliminado')),
  plan              jsonb,
  start_date        date,
  end_date          date,
  welcome_video_url text default '',
  avatar            text,
  routine           jsonb,
  diet              jsonb,
  calendar_tasks    jsonb not null default '{}'::jsonb,
  questionnaires    jsonb not null default '[]'::jsonb,
  responses         jsonb not null default '[]'::jsonb,
  load_records      jsonb not null default '[]'::jsonb,
  measures          jsonb not null default '[]'::jsonb,   -- ← se perdía
  steps_history     jsonb not null default '[]'::jsonb,   -- ← se perdía
  sessions          jsonb not null default '{}'::jsonb,   -- ← se perdía
  food_photos       jsonb not null default '{}'::jsonb,   -- ← se perdía
  achievements      jsonb not null default '[]'::jsonb,   -- ← se perdía
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.clients add column if not exists measures      jsonb not null default '[]'::jsonb;
alter table public.clients add column if not exists steps_history jsonb not null default '[]'::jsonb;
alter table public.clients add column if not exists sessions      jsonb not null default '{}'::jsonb;
alter table public.clients add column if not exists food_photos   jsonb not null default '{}'::jsonb;
alter table public.clients add column if not exists achievements  jsonb not null default '[]'::jsonb;
alter table public.clients add column if not exists avatar        text;

-- Un paciente sólo puede pertenecer a un coach (RN-C04)
create unique index if not exists clients_email_unique on public.clients (lower(email));
create index if not exists clients_coach_idx on public.clients (coach_id);

-- ------------------------------------------------------------
-- 3. LIBRERÍA DEL COACH
--    Todo esto vivía SOLO en localStorage. Ahora es de verdad.
-- ------------------------------------------------------------

-- Rutinas / programas plantilla
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  days        jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists programs_coach_idx on public.programs (coach_id);

-- Plantillas de dieta
create table if not exists public.diet_plans (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  macros      jsonb not null default '{}'::jsonb,
  meals       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists diet_plans_coach_idx on public.diet_plans (coach_id);

-- Cuestionarios
create table if not exists public.questionnaires (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  questions   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists questionnaires_coach_idx on public.questionnaires (coach_id);

-- Alimentos
create table if not exists public.foods (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  category     text default '',
  unit         text default '',
  portion_g    numeric,
  default_qty  numeric default 1,
  kcal         numeric default 0,
  protein      numeric default 0,
  carbs        numeric default 0,
  fat          numeric default 0,
  created_at   timestamptz not null default now()
);
create index if not exists foods_coach_idx on public.foods (coach_id);

-- Recetas
create table if not exists public.recipes (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  meal_time    text default '',
  difficulty   text default '',
  tags         jsonb not null default '[]'::jsonb,
  image_url    text,
  ingredients  jsonb not null default '[]'::jsonb,
  steps        jsonb not null default '[]'::jsonb,
  macros       jsonb not null default '{}'::jsonb,
  author       text default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists recipes_coach_idx on public.recipes (coach_id);

-- Documentos (librería) — ahora con archivo real, no URL de Drive
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.profiles(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete set null,
  title        text not null,
  category     text default '',
  description  text default '',
  storage_path text,             -- ruta dentro del bucket 'documents'
  file_name    text,
  file_size    bigint,
  created_at   timestamptz not null default now()
);
create index if not exists documents_coach_idx on public.documents (coach_id);

-- Ejercicios (para el buscador de rutinas, incluye cardio)
create table if not exists public.exercises (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid references public.profiles(id) on delete cascade, -- null = global
  name        text not null,
  category    text default '',
  video_url   text,
  created_at  timestamptz not null default now()
);
create index if not exists exercises_coach_idx on public.exercises (coach_id);

-- ------------------------------------------------------------
-- 4. updated_at automático
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['clients','programs','diet_plans','recipes'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 5. ALTA AUTOMÁTICA: auth.users → profiles → clients
--    "Todo el que se registra en la app es paciente" (RN-F3-06)
--    Los triggers nunca bloquean el registro si algo falla.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.profiles (id, name, email, role)
    values (new.id,
            coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
            new.email,
            'patient')                    -- SIEMPRE paciente. Coach se asigna a mano.
    on conflict (id) do nothing;
  exception when others then null;
  end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_new_patient()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_coach uuid;
begin
  begin
    if new.role = 'patient' then
      select id into v_coach from public.profiles where role = 'coach' order by created_at limit 1;
      insert into public.clients (id, name, email, coach_id, status)
      values (new.id, new.name, new.email, v_coach, 'active')
      on conflict (lower(email)) do update
        set status   = 'active',                                  -- reactiva, no duplica
            name     = excluded.name,
            coach_id = coalesce(public.clients.coach_id, excluded.coach_id);
    end if;
  exception when others then null;
  end;
  return new;
end $$;

drop trigger if exists on_profile_created_patient on public.profiles;
create trigger on_profile_created_patient
after insert on public.profiles
for each row execute function public.handle_new_patient();

-- ------------------------------------------------------------
-- 6. RLS — Row Level Security
-- ------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.clients        enable row level security;
alter table public.programs       enable row level security;
alter table public.diet_plans     enable row level security;
alter table public.questionnaires enable row level security;
alter table public.foods          enable row level security;
alter table public.recipes        enable row level security;
alter table public.documents      enable row level security;
alter table public.exercises      enable row level security;

-- Helper: ¿el usuario actual es coach?
create or replace function public.is_coach()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;

-- PROFILES: cada quien lee y actualiza el suyo
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- CLIENTS: el coach manda sobre los suyos; el paciente lee y edita SOLO lo suyo
drop policy if exists clients_coach_all on public.clients;
create policy clients_coach_all on public.clients
  for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists clients_patient_select on public.clients;
create policy clients_patient_select on public.clients
  for select to authenticated using (id = auth.uid());

drop policy if exists clients_patient_update on public.clients;
create policy clients_patient_update on public.clients
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- LIBRERÍA DEL COACH: dueño total; el paciente no la ve
do $$
declare t text;
begin
  foreach t in array array['programs','diet_plans','questionnaires','foods','recipes','documents'] loop
    execute format('drop policy if exists %1$s_owner on public.%1$s', t);
    execute format(
      'create policy %1$s_owner on public.%1$s for all to authenticated
       using (coach_id = auth.uid()) with check (coach_id = auth.uid())', t);
  end loop;
end $$;

-- El paciente puede leer los documentos que se le asignaron
drop policy if exists documents_patient_read on public.documents;
create policy documents_patient_read on public.documents
  for select to authenticated using (client_id = auth.uid());

-- EXERCISES: todos leen los globales; el coach maneja los suyos
drop policy if exists exercises_read on public.exercises;
create policy exercises_read on public.exercises
  for select to authenticated using (coach_id is null or coach_id = auth.uid());

drop policy if exists exercises_write on public.exercises;
create policy exercises_write on public.exercises
  for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- ------------------------------------------------------------
-- 7. STORAGE: bucket privado para documentos y fotos
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents','documents', false)
on conflict (id) do nothing;

drop policy if exists documents_bucket_rw on storage.objects;
create policy documents_bucket_rw on storage.objects
  for all to authenticated
  using (bucket_id = 'documents') with check (bucket_id = 'documents');

-- ------------------------------------------------------------
-- 8. BACKFILL: repara cuentas existentes sin perfil / sin ficha
-- ------------------------------------------------------------
insert into public.profiles (id, name, email, role)
select u.id,
       coalesce(u.raw_user_meta_data->>'name', split_part(u.email,'@',1)),
       u.email,
       'patient'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

insert into public.clients (id, name, email, coach_id, status)
select p.id, p.name, p.email,
       (select id from public.profiles where role='coach' order by created_at limit 1),
       'active'
from public.profiles p
where p.role = 'patient'
  and not exists (select 1 from public.clients c where lower(c.email) = lower(p.email))
on conflict (lower(email)) do nothing;
