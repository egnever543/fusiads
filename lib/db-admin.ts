import { readFile } from "fs/promises";
import path from "path";
import { Client } from "pg";

// ==========================================================================
// Migração do banco a partir do painel /admin. Roda APENAS no servidor.
//
// Executa o schema versionado do repositório (supabase/schema.sql), que é
// idempotente: cria o que falta e não mexe no que já existe. Serve tanto para
// clientes novos (cria tudo) quanto para atualizações (adiciona colunas novas).
//
// A conexão usa a connection string do Postgres que a integração Supabase↔Vercel
// já provisiona (POSTGRES_URL_NON_POOLING de preferência — conexão direta, ideal
// para DDL). NUNCA expor essas strings ao navegador.
// ==========================================================================

function connectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    undefined
  );
}

export function dbAdminConfigured(): boolean {
  return Boolean(connectionString());
}

function newClient(): Client {
  const conn = connectionString();
  if (!conn) throw new Error("Sem connection string do Postgres (POSTGRES_URL_NON_POOLING).");
  // Supabase exige SSL; a CA pode não estar no bundle, então não verificamos a
  // cadeia (a conexão continua criptografada).
  return new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
}

// Lê o schema versionado. O arquivo é incluído no bundle pelo
// outputFileTracingIncludes (ver next.config.js).
async function readSchema(): Promise<string> {
  const p = path.join(process.cwd(), "supabase", "schema.sql");
  return readFile(p, "utf8");
}

export async function runMigrations(): Promise<{ ok: boolean; error?: string }> {
  if (!dbAdminConfigured()) {
    return { ok: false, error: "Conexão com o banco não configurada (POSTGRES_URL_NON_POOLING)." };
  }
  let sql: string;
  try {
    sql = await readSchema();
  } catch (e) {
    return { ok: false, error: `Não foi possível ler o schema: ${(e as Error).message}` };
  }
  const client = newClient();
  try {
    await client.connect();
    await client.query(sql);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  } finally {
    await client.end().catch(() => {});
  }
}

// Tabelas e colunas que o app espera. Usado só para exibir o status no /admin.
const EXPECTED: { table: string; columns: string[] }[] = [
  { table: "site_config", columns: [] },
  { table: "leads", columns: ["gclid", "gbraid", "wbraid", "sold", "sale_value", "sold_at"] },
  { table: "renewals", columns: ["gclid", "gbraid", "wbraid", "renewed_at"] },
  { table: "secrets", columns: [] },
];

export type DbStatusItem = {
  table: string;
  exists: boolean;
  missingColumns: string[];
};

export type DbStatus =
  | { configured: false }
  | { configured: true; ok: boolean; items: DbStatusItem[]; error?: string };

export async function getDbStatus(): Promise<DbStatus> {
  if (!dbAdminConfigured()) return { configured: false };
  const client = newClient();
  try {
    await client.connect();
    const names = EXPECTED.map((e) => e.table);
    const { rows } = await client.query<{ table_name: string; column_name: string }>(
      `select table_name, column_name
         from information_schema.columns
        where table_schema = 'public' and table_name = any($1::text[])`,
      [names]
    );

    const byTable = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!byTable.has(r.table_name)) byTable.set(r.table_name, new Set());
      byTable.get(r.table_name)!.add(r.column_name);
    }

    const items: DbStatusItem[] = EXPECTED.map((e) => {
      const cols = byTable.get(e.table);
      const exists = Boolean(cols);
      const missingColumns = exists ? e.columns.filter((c) => !cols!.has(c)) : e.columns;
      return { table: e.table, exists, missingColumns };
    });

    const ok = items.every((i) => i.exists && i.missingColumns.length === 0);
    return { configured: true, ok, items };
  } catch (e) {
    return { configured: true, ok: false, items: [], error: (e as Error).message };
  } finally {
    await client.end().catch(() => {});
  }
}
