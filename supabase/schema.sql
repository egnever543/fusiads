-- ==========================================================================
-- Schema do Supabase para o projeto fusiads
-- Rode isto no SQL Editor do painel do Supabase (uma vez).
-- ==========================================================================

-- Tabela de configuracao do site. Guardamos tudo numa unica linha (id = 1)
-- em uma coluna JSONB "data", pra ficar simples e flexivel.
create table if not exists public.site_config (
  id integer primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_config_singleton check (id = 1)
);

-- Garante que a linha unica exista.
insert into public.site_config (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- Habilita Row Level Security.
alter table public.site_config enable row level security;

-- O front (chave anon) pode LER a configuracao (numeros, tag, textos).
drop policy if exists "site_config_public_read" on public.site_config;
create policy "site_config_public_read"
  on public.site_config
  for select
  using (true);

-- A gravacao acontece apenas no servidor com a chave service_role,
-- que ignora RLS. Por isso NAO criamos policy de escrita para anon.
