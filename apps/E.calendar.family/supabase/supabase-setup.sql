-- =============================================================
-- eCalendar Family — pont de synchronisation Supabase (mode table)
-- À coller une fois dans le SQL Editor du projet (barakfix ou autre) :
-- table + policies RLS. Les données sont chiffrées côté navigateur
-- avec le jeton familial (AES-GCM) : illisibles sans le jeton.
-- Idempotent : peut être ré-exécuté sans risque.
-- =============================================================

create table if not exists famille_sync (
  id text primary key,            -- 'calfam' ou 'repas'
  jeton text not null default 'x', -- inutilisé (chiffrement côté client)
  contenu jsonb not null,         -- { "c": "<données chiffrées>" }
  maj timestamptz not null default now()
);

alter table famille_sync enable row level security;

-- Écriture (publication depuis calfam / repas)
drop policy if exists "famille_sync_insert" on famille_sync;
create policy "famille_sync_insert" on famille_sync
  for insert to anon with check (true);

drop policy if exists "famille_sync_update" on famille_sync;
create policy "famille_sync_update" on famille_sync
  for update to anon using (true) with check (true);

-- Lecture (eCalendar Family). Le contenu est chiffré : sans le jeton
-- familial, on ne voit qu'un bloc illisible.
drop policy if exists "famille_sync_select" on famille_sync;
create policy "famille_sync_select" on famille_sync
  for select to anon using (true);

select 'OK — synchronisation eCalendar Family prête' as resultat;
