-- Barakfix — Row Level Security

alter table profiles enable row level security;
alter table properties enable row level security;
alter table tenants enable row level security;
alter table requests enable row level security;
alter table interventions enable row level security;
alter table request_photos enable row level security;

-- Helper : id du locataire connecté via JWT de fonction serverless
create or replace function public.current_tenant_id()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid
$$;

-- Helper : le user est-il bailleur ?
create or replace function public.is_owner()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'bailleur'
  )
$$;

-- PROFILES
create policy "own profile" on profiles
  for select using (id = auth.uid());

create policy "owner profile for tenants" on profiles
  for select using (
    role = 'bailleur'
    and exists (
      select 1 from requests r
      join properties p on p.id = r.property_id
      join tenants t on t.property_id = p.id
      where t.id = public.current_tenant_id()
        and p.owner_id = profiles.id
    )
  );

-- PROPERTIES
create policy "owner crud" on properties
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "tenant sees own property" on properties
  for select using (
    exists (
      select 1 from tenants t
      where t.property_id = properties.id
        and t.id = public.current_tenant_id()
    )
  );

-- TENANTS
create policy "owner manages tenants" on tenants
  for all using (
    exists (
      select 1 from properties p
      where p.id = tenants.property_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from properties p
      where p.id = tenants.property_id and p.owner_id = auth.uid()
    )
  );

-- REQUESTS
create policy "owner sees requests" on requests
  for select using (
    exists (
      select 1 from properties p
      where p.id = requests.property_id and p.owner_id = auth.uid()
    )
  );

create policy "owner updates requests" on requests
  for update using (
    exists (
      select 1 from properties p
      where p.id = requests.property_id and p.owner_id = auth.uid()
    )
  );

create policy "tenant sees own requests" on requests
  for select using (
    exists (
      select 1 from tenants t
      where t.property_id = requests.property_id
        and t.id = public.current_tenant_id()
    )
  );

create policy "tenant inserts requests" on requests
  for insert with check (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from tenants t
      where t.property_id = requests.property_id
        and t.id = public.current_tenant_id()
    )
  );

-- INTERVENTIONS : bailleur uniquement
create policy "owner only interventions" on interventions
  for all using (
    exists (
      select 1 from requests r
      join properties p on p.id = r.property_id
      where r.id = interventions.request_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from requests r
      join properties p on p.id = r.property_id
      where r.id = interventions.request_id and p.owner_id = auth.uid()
    )
  );

-- REQUEST_PHOTOS
create policy "owner sees photos" on request_photos
  for all using (
    exists (
      select 1 from requests r
      join properties p on p.id = r.property_id
      where r.id = request_photos.request_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from requests r
      join properties p on p.id = r.property_id
      where r.id = request_photos.request_id and p.owner_id = auth.uid()
    )
  );

create policy "tenant sees photos" on request_photos
  for select using (
    exists (
      select 1 from requests r
      join tenants t on t.property_id = r.property_id
      where r.id = request_photos.request_id and t.id = public.current_tenant_id()
    )
  );

create policy "tenant inserts photos" on request_photos
  for insert with check (
    exists (
      select 1 from requests r
      where r.id = request_photos.request_id
        and r.tenant_id = public.current_tenant_id()
    )
  );

-- Storage photos
create policy "public read photos" on storage.objects
  for select using (bucket_id = 'photos');

create policy "tenant upload photos" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and public.current_tenant_id() is not null
  );

create policy "owner upload photos" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and public.is_owner()
  );
