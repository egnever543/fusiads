# Fusiads

Landing page (front) + painel administrativo (`/admin`) em um único app **Next.js**, pronto para deploy na **Vercel**, com dados no **Supabase**.

## O que faz

- **Front (`/`)**: landing da PREMIUM TV com um **fluxo de chat** estilo WhatsApp
  (substitui o Typebot). O visitante escolhe o dispositivo (e, quando existe,
  a marca/tipo) e é encaminhado ao WhatsApp.
- **Divisão de tráfego**: até **4 números** de WhatsApp com **peso**. Ao concluir
  o fluxo, um número é sorteado pela proporção dos pesos.
- **Mensagem personalizada**: a mensagem enviada ao WhatsApp inclui o
  **dispositivo escolhido** + um **código único** (ex: `PT-MSXGTY9HP7P`).
- **Rastreamento no Supabase**: ao concluir o fluxo, grava um **lead** com esse
  código + `gclid`, `fbclid`, UTMs, referrer e user-agent. Depois você cruza o
  código recebido no WhatsApp com a tabela `leads` para recuperar o `gclid`.
- **Google Ads**: injeta o `gtag` e dispara uma **conversão** ao concluir o fluxo.
- **Painel `/admin`** (protegido por senha): edita os números, pesos, mensagem
  base e a tag do Google Ads.
- **Supabase**: guarda a configuração (`site_config`) e os leads (`leads`).

## Configuração

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Project Settings → API**, copie a URL, a chave `anon` e a chave `service_role`.

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # segredo, só no servidor
ADMIN_PASSWORD=...              # senha do painel /admin
```

### 3. Rodar localmente

```bash
npm install
npm run dev
```

- Front: http://localhost:3000
- Admin: http://localhost:3000/admin

## Deploy na Vercel

1. Importe o repositório na Vercel (framework Next.js detectado automaticamente).
2. Em **Settings → Environment Variables**, adicione as 4 variáveis acima.
3. Deploy. Pronto.

## O front (PREMIUM TV)

A landing recriada fica em [`app/page.tsx`](app/page.tsx) e o CSS em
[`app/_components/landing.css`](app/_components/landing.css). Todos os botões
"TESTAR AGORA", os botões dos planos e o botão flutuante usam o componente
[`WhatsAppCTA`](app/_components/WhatsAppCTA.tsx): no clique ele sorteia um dos
números ativos (pela proporção dos pesos), dispara a conversão do Google Ads
(se o rótulo estiver preenchido) e abre o WhatsApp.

> O site original abria um chatbot (Typebot). Aqui isso foi substituído por um
> **fluxo de chat nativo** ([`lib/flow.ts`](lib/flow.ts) +
> [`app/_components/ChatFlow.tsx`](app/_components/ChatFlow.tsx)) com divisão de
> tráfego, que é o objetivo do painel.

O ID do Google Ads já vem pré-preenchido com `AW-17909477604` (editável em
`/admin`). Para a conversão disparar ao concluir o fluxo, preencha também o
**rótulo da conversão** no painel (você pega isso no Google Ads, na ação de
conversão).

### Editar o fluxo de chat

O fluxo (perguntas, opções e ramificações) fica em [`lib/flow.ts`](lib/flow.ts).
Cada opção com `next` leva a outra pergunta; sem `next`, ela finaliza e vai para
o WhatsApp. O `value` de cada escolha é concatenado no rótulo do dispositivo
enviado na mensagem.

### Recuperar o gclid de um lead

Cada lead recebe um código (ex: `PT-MSXGTY9HP7P`), que chega junto na mensagem do
WhatsApp. No Supabase (tabela `leads`), busque por esse `id` para obter o `gclid`
e os demais dados de rastreamento daquele visitante.
