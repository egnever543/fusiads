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

-- ==========================================================================
-- Tabela de leads. Cada visitante que conclui o fluxo de chat gera um lead
-- com um ID unico (o mesmo ID enviado na mensagem do WhatsApp), o dispositivo
-- escolhido e os dados de rastreamento (gclid, utm, etc). Depois voce cruza
-- o ID recebido no WhatsApp com esta tabela para recuperar o gclid.
-- ==========================================================================
create table if not exists public.leads (
  id           text primary key,
  device       text,
  path         jsonb,
  gclid        text,
  fbclid       text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,
  referrer     text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists leads_gclid_idx on public.leads (gclid);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- RLS ligado; escrita apenas via service_role (servidor). Sem policies anon.
alter table public.leads enable row level security;
