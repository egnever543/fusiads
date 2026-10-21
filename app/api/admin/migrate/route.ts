import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { runMigrations, getDbStatus } from "@/lib/db-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Status do banco (quais tabelas/colunas existem). Só admin logado.
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const status = await getDbStatus();
  return NextResponse.json(status);
}

// Roda a migração (schema versionado, idempotente). Só admin logado.
// Não recebe SQL do cliente — executa apenas o schema do repositório.
export async function POST() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const result = await runMigrations();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  const status = await getDbStatus();
  return NextResponse.json({ ok: true, status });
}
