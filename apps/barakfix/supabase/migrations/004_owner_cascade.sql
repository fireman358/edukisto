-- Barakfix — cascade de suppression du compte bailleur
-- À exécuter dans le SQL Editor Supabase (une seule fois, après 001 et 002)
-- Permet à la fonction /api/owner-delete de tout supprimer en cascade :
-- utilisateur -> profil -> logements -> locataires -> demandes -> interventions -> photos

alter table profiles
  drop constraint if exists profiles_id_fkey;

alter table profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;
