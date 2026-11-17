-- À lancer une fois dans Supabase > SQL Editor :
-- la Suisse devient un sticker « Gymnasia » (sans personne) et « Le club » disparaît des membres.
alter table public.stickers alter column person_id drop not null;
update public.stickers set person_id = null, place = 'Suisse' where person_id = 'club';
delete from public.people where id = 'club';
