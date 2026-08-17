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

## Trocar o front pelo HTML do seu site

O template padrão fica em [`app/page.tsx`](app/page.tsx). Para usar o HTML do seu
site existente, substitua o conteúdo do `<main>` pelo seu HTML e troque os botões
de ação pelo componente `<WhatsAppCTA />` — ele cuida da divisão de tráfego e da
conversão do Google Ads automaticamente.
