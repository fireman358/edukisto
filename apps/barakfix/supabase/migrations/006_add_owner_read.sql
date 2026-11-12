-- Barakfix — ajoute la colonne owner_read manquante
-- À exécuter dans le SQL Editor Supabase (une seule fois)
-- Votre base avait été créée avec une ancienne version du schéma,
-- sans la colonne owner_read (marqueur « demande non lue » du bailleur).

alter table public.requests
  add column if not exists owner_read boolean not null default false;

-- Les anciennes demandes sont considérées comme lues
update public.requests set owner_read = true where owner_read = false;
