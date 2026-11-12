-- Barakfix — schéma initial
create extension if not exists "pgcrypto";

create type request_status as enum ('nouveau', 'planifie', 'en_cours', 'resolu');
create type request_urgency as enum ('basse', 'normale', 'haute', 'urgente');
create type request_category as enum ('plomberie', 'electricite', 'chauffage', 'menuiserie', 'toiture', 'serrurerie', 'electromenager', 'autre');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role text not null check (role in ('bailleur', 'locataire')),
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  address text not null,
  type text not null default 'appartement',
  notes text,
  access_code text unique not null,
  access_code_revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  full_name text not null,
  phone text,
  email text not null,
  pin_hash text not null,
  pin_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  title text not null,
  category request_category not null,
  urgency request_urgency not null,
  status request_status not null default 'nouveau',
  description text not null,
  owner_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table interventions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  artisan_name text,
  artisan_phone text,
  cost numeric(10,2),
  scheduled_date date,
  performed_date date,
  created_at timestamptz not null default now()
);

create table request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index idx_requests_property on requests(property_id);
create index idx_requests_tenant on requests(tenant_id);

-- Profil automatique à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (new.id, new.email, 'bailleur', coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Bucket photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;
