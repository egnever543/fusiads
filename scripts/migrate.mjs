// ==========================================================================
// Migração automática do banco no build de produção do Vercel.
//
// Roda ANTES do `next build` (ver vercel.json → buildCommand). Como cada
// cliente redeploya sozinho quando o `main` muda, a migração acontece em massa,
// sem apertar botão. Executa o schema versionado (idempotente): cria o que
// falta e não mexe no que já existe.
//
// Regras de segurança/robustez:
//  - Só roda em build de PRODUÇÃO (VERCEL_ENV === "production"). Previews e
//    build local são ignorados (não tocam no banco).
//  - Nunca derruba o deploy: se algo falhar (banco indisponível, etc.), apenas
//    registra um aviso e segue — o build continua e o botão do /admin fica como
//    alternativa manual. Na próxima publicação, tenta de novo.
//  - A connection string vem das variáveis que a integração Supabase↔Vercel já
//    provisiona (POSTGRES_URL_NON_POOLING de preferência). Nunca é exposta.
// ==========================================================================

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

async function main() {
  const env = process.env.VERCEL_ENV;
  if (env && env !== "production") {
    console.log(`[migrate] pulando: VERCEL_ENV=${env} (só roda em produção).`);
    return;
  }

  const conn =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;
  if (!conn) {
    console.log("[migrate] pulando: sem connection string do Postgres.");
    return;
  }

  let sql;
  try {
    sql = readFileSync(path.join(process.cwd(), "supabase", "schema.sql"), "utf8");
  } catch (e) {
    console.warn(`[migrate] não foi possível ler o schema.sql: ${e?.message ?? e}`);
    return;
  }

  // pg é CommonJS; importamos dinamicamente para não quebrar quando ausente.
  let Client;
  try {
    ({ Client } = (await import("pg")).default ?? (await import("pg")));
  } catch (e) {
    console.warn(`[migrate] pacote 'pg' indisponível: ${e?.message ?? e}`);
    return;
  }

  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    console.log("[migrate] banco atualizado com sucesso.");
  } catch (e) {
    console.warn(`[migrate] falha ao atualizar o banco (deploy segue): ${e?.message ?? e}`);
  } finally {
    await client.end().catch(() => {});
  }
}

// Nunca falha o build.
main()
  .catch((e) => console.warn(`[migrate] erro inesperado (deploy segue): ${e?.message ?? e}`))
  .finally(() => process.exit(0));
