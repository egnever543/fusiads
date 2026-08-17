import { NextResponse } from "next/server";
import { insertLead, type LeadInput } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recebe o lead do fluxo de chat e grava no Supabase (chave service_role).
export async function POST(request: Request) {
  let body: LeadInput | null = null;
  try {
    body = (await request.json()) as LeadInput;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  if (!body || !body.id) {
    return NextResponse.json({ ok: false, error: "ID ausente." }, { status: 400 });
  }

  const result = await insertLead(body);
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
