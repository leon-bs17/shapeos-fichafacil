-- Administrative connection; counters and fixtures always roll back.
begin;
do $$
declare p uuid; a uuid; r jsonb; i integer; minute_start timestamptz:=date_trunc('minute',clock_timestamp()); day_start timestamptz:=date_trunc('day',clock_timestamp() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
 select id into p from public.usuarios where tipo='PERSONAL' and status_conta='ATIVO' limit 1;
 select id into a from public.usuarios where tipo='ALUNO' and status_conta='ATIVO' limit 1;
 if p is null or a is null then raise exception 'Fixtures missing'; end if;
 delete from shapeos_private.mys_cotas where chave in ('minute:'||p,'day:'||p,'minute:'||a,'day:'||a,'global:day');
 perform set_config('request.jwt.claims',json_build_object('sub',p,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 for i in 1..8 loop
  r:=public.consumir_cota_mys();
  if r->>'permitido'<>'true' then raise exception 'Valid quota rejected: %',r; end if;
 end loop;
 r:=public.consumir_cota_mys();
 if r->>'permitido'<>'false' or r->>'motivo'<>'minuto' or (r->>'retry_after')::int<1 then raise exception 'Minute limit failed: %',r; end if;
 begin
  perform 1 from shapeos_private.mys_cotas;
  raise exception 'Client accessed counters';
 exception when insufficient_privilege then null; end;
 begin
  perform public.admin_control('CONFIGURAR',null,'{}');
  raise exception 'Personal executed admin action';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
 r:=public.consumir_cota_mys();
 if r->>'permitido'<>'true' then raise exception 'Active Student quota rejected'; end if;
 execute 'reset role';
 update shapeos_private.mys_cotas set quantidade=0 where chave='minute:'||p;
 update shapeos_private.mys_cotas set quantidade=100,periodo=day_start where chave='day:'||p;
 perform set_config('request.jwt.claims',json_build_object('sub',p,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 r:=public.consumir_cota_mys();
 if r->>'motivo'<>'dia' or r->>'permitido'<>'false' then raise exception 'Daily limit failed'; end if;
 execute 'reset role';
 update shapeos_private.mys_cotas set quantidade=0 where chave='day:'||p;
 update shapeos_private.mys_cotas set quantidade=1000,periodo=day_start where chave='global:day';
 execute 'set local role authenticated';
 r:=public.consumir_cota_mys();
 if r->>'motivo'<>'global' or r->>'permitido'<>'false' then raise exception 'Global limit failed'; end if;
 execute 'reset role';
 if (select quantidade from shapeos_private.mys_cotas where chave='minute:'||p)<>0 then raise exception 'Rejected request consumed quota'; end if;
 execute 'set local role anon';
 begin
  perform public.consumir_cota_mys();
  raise exception 'Anonymous consumed quota';
 exception when insufficient_privilege then null; end;
 if public.cadastro_shapeos_aberto() is null then raise exception 'Public registration state inaccessible'; end if;
 execute 'reset role';
end $$;
rollback;
