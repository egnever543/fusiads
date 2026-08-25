import { NextResponse } from "next/server";
import { provisionRenewal } from "@/lib/provisioning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook do provedor de PIX (FastDePix). Também chama a renovação — assim,
// mesmo que o cliente feche a aba, a conta é renovada. O provisionamento
// reconfirma o pagamento na fonte e é idempotente (claim atômico), então não
// renova em dobro junto com o polling.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  // A FastDePix envia o id da transação; aceitamos alguns formatos comuns.
  const transactionId = String(
    body?.transaction_id ?? body?.id ?? body?.data?.id ?? ""
  ).trim();
  if (!transactionId) {
    return NextResponse.json({ ok: false }, { status: 200 }); // não força retry do provedor
  }
  await provisionRenewal(transactionId).catch((e) => console.error("webhook renew:", e));
  return NextResponse.json({ ok: true });
}
