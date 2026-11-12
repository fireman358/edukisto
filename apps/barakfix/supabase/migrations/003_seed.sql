-- Barakfix — seed de démonstration (FACULTATIF)
-- À exécuter APRÈS avoir créé un compte bailleur.
-- Les pin_hash sont des placeholders : recréez les locataires via l'interface
-- pour définir de vrais PIN.

with owner as (select id from profiles where role = 'bailleur' order by created_at limit 1)
insert into properties (owner_id, address, type, notes, access_code)
select o.id, '12 Rue Haute, 1000 Bruxelles', 'appartement', 'Étage 2, sonnerie Demoulin', 'BRU-HAU-12'
from owner o
union all
select o.id, '45 Chaussée de Gand, 1080 Molenbeek-Saint-Jean', 'maison', 'Jardin à l''arrière', 'MOL-DEG-45'
from owner o;

insert into tenants (property_id, full_name, phone, email, pin_hash)
select p.id, 'Demoulin David', '+32 4XX XX XX', 'david.demoulin@example.com', 'placeholder-recreez-via-interface'
from properties p where p.access_code = 'BRU-HAU-12';

insert into tenants (property_id, full_name, phone, email, pin_hash)
select p.id, 'Peeters Marie', '+32 4XX XX XX', 'marie.peeters@example.com', 'placeholder-recreez-via-interface'
from properties p where p.access_code = 'MOL-DEG-45';

insert into requests (property_id, tenant_id, title, category, urgency, status, description)
select p.id, t.id, 'Fuite sous l''évier de la cuisine', 'plomberie', 'urgente', 'nouveau',
  'L''eau goutte en continu depuis ce matin, sceau placé en dessous.'
from properties p join tenants t on t.property_id = p.id
where p.access_code = 'BRU-HAU-12';

insert into requests (property_id, tenant_id, title, category, urgency, status, description)
select p.id, t.id, 'Radiateur salon reste froid', 'chauffage', 'haute', 'en_cours',
  'Malgré la vanne ouverte, le radiateur ne chauffe plus du tout.'
from properties p join tenants t on t.property_id = p.id
where p.access_code = 'BRU-HAU-12';

insert into requests (property_id, tenant_id, title, category, urgency, status, description)
select p.id, t.id, 'Serrure porte d''entrée dure', 'serrurerie', 'normale', 'planifie',
  'Il faut forcer un peu pour fermer à clé, surtout par temps humide.'
from properties p join tenants t on t.property_id = p.id
where p.access_code = 'MOL-DEG-45';

insert into requests (property_id, tenant_id, title, category, urgency, status, description)
select p.id, t.id, 'Volet roulant bloqué à moitié', 'menuiserie', 'basse', 'resolu',
  'Le volet de la chambre reste bloqué à 30 cm du haut.'
from properties p join tenants t on t.property_id = p.id
where p.access_code = 'MOL-DEG-45';

insert into interventions (request_id, artisan_name, artisan_phone, cost, scheduled_date, performed_date)
select r.id, 'Plomberie Dupont', '+32 2 XXX XX XX', 145.00, current_date + 2, null
from requests r where r.title like 'Serrure%';
