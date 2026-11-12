-- Barakfix — fix « role "locataire" does not exist »
-- À exécuter dans le SQL Editor Supabase (une seule fois, après 002)

create or replace function public.current_tenant_id()
returns uuid
language plpgsql
stable
as $$
declare
  claims text;
  tenant_id text;
begin
  begin
    claims := current_setting('request.jwt.claims', true);
    if claims is null or claims = '' then
      return null;
    end if;
    tenant_id := (claims::json->>'tenant_id');
    if tenant_id is null or tenant_id = '' then
      return null;
    end if;
    return tenant_id::uuid;
  exception when others then
    return null;
  end;
end;
$$;
