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
  // Aceita os formatos comuns:
  //  - FastDePix: { transaction_id } ou { id }
  //  - paggOne:   { event, data: { id: "txn_..." } } (o id da transação é o
  //    mesmo que guardamos como transaction_id da renovação).
  const transactionId = String(
    body?.data?.id ??
      body?.transaction_id ??
      body?.id ??
      body?.data?.transaction_id ??
      body?.data?.transaction?.id ??
      ""
  ).trim();
  if (!transactionId) {
    return NextResponse.json({ ok: false }, { status: 200 }); // não força retry do provedor
  }
  // O provisionamento reconfirma o pagamento na fonte (pelo provedor da
  // renovação) e é idempotente, então um webhook forjado não libera nada.
  await provisionRenewal(transactionId).catch((e) => console.error("webhook renew:", e));
  return NextResponse.json({ ok: true });
}
