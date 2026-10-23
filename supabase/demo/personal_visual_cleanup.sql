-- Run manually only when removal of the demo dataset is requested.
-- Identifies only the three placeholder accounts created by personal_visual_seed.sql.
begin;
do $cleanup$
declare v_owner uuid := 'f0291878-1c10-4fc8-b4cb-4a2db7a717e8';
begin
  if exists(
    select 1 from public.personal_alunos p join auth.users a on a.id=p.aluno_id
    where a.raw_app_meta_data->>'demo_seed'='shapeos-personal-visual-v1'
      and a.raw_app_meta_data->>'demo_owner'=v_owner::text and p.personal_id<>v_owner
  ) then raise exception 'Demo student was linked to another Personal; review before deletion'; end if;
  if exists(
    select 1 from public.treinos t join auth.users a on a.id=t.aluno_id
    where a.raw_app_meta_data->>'demo_seed'='shapeos-personal-visual-v1'
      and a.raw_app_meta_data->>'demo_owner'=v_owner::text and t.personal_id<>v_owner
  ) then raise exception 'Demo student has another Personal workout; review before deletion'; end if;
  delete from auth.users
  where raw_app_meta_data->>'demo_seed'='shapeos-personal-visual-v1'
    and raw_app_meta_data->>'demo_owner'=v_owner::text
    and email in ('ana.visual@demo.shapeos.invalid','bruno.visual@demo.shapeos.invalid','carla.visual@demo.shapeos.invalid');
end $cleanup$;
commit;
