import { NextResponse } from "next/server";
import { provisionRenewal } from "@/lib/provisioning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chamada pelo cliente (polling) quando o PIX confirma. Idempotente.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const transactionId = String(body?.transactionId ?? "").trim();
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId obrigatório." }, { status: 400 });
  }
  const result = await provisionRenewal(transactionId);
  return NextResponse.json(
    result.ok ? { ok: true, amount: result.amount } : { ok: false, error: result.error },
    { status: result.status }
  );
}
