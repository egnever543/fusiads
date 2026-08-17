# Fusiads

Landing page (front) + painel administrativo (`/admin`) em um único app **Next.js**, pronto para deploy na **Vercel**, com dados no **Supabase**.

## O que faz

- **Front (`/`)**: landing page com botão de WhatsApp.
- **Divisão de tráfego**: até **4 números** de WhatsApp com **peso**. A cada clique, um número é sorteado pela proporção dos pesos.
- **Google Ads**: injeta o `gtag` e dispara uma **conversão** no clique do botão de WhatsApp.
- **Painel `/admin`** (protegido por senha): edita os números, pesos, mensagem, tag do Google Ads e os textos do site.
- **Supabase**: guarda a configuração numa tabela simples.

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

> O site original abria um chatbot (Typebot). Aqui isso foi substituído pelo
> fluxo de WhatsApp com divisão de tráfego, que é o objetivo do painel.

O ID do Google Ads já vem pré-preenchido com `AW-17909477604` (editável em
`/admin`). Para a conversão disparar no clique, preencha também o **rótulo da
conversão** no painel (você pega isso no Google Ads, na ação de conversão).
