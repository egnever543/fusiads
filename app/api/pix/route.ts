import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { getPackage, priceReais } from "@/lib/packages";
import { findCustomerByUsername, sigmaConfigured } from "@/lib/sigma";
import { createTransaction, getTransaction, pixConfigured } from "@/lib/fastdepix";
import { saveRenewalInit } from "@/lib/renewals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cria a cobrança PIX para renovar um cliente. O VALOR vem do servidor (pacote),
// nunca do cliente.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim();
  const packageId = String(body?.packageId ?? "").trim();
  const gclid = body?.gclid ? String(body.gclid) : null;

  const config = await getConfig();
  if (!config.payments.pix) {
    return NextResponse.json({ error: "Pagamento PIX indisponível." }, { status: 400 });
  }
  if (!pixConfigured() || !sigmaConfigured()) {
    return NextResponse.json({ error: "Pagamento não configurado." }, { status: 500 });
  }

  const pkg = getPackage(packageId);
  if (!pkg) return NextResponse.json({ error: "Pacote inválido." }, { status: 400 });

  const customer = await findCustomerByUsername(username);
  if (!customer) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const notificationUrl = host ? `${proto}://${host}/api/webhook` : undefined;

  let tx;
  try {
    tx = await createTransaction({ amount: priceReais(pkg.priceCents), notificationUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  await saveRenewalInit({
    transactionId: String(tx.id),
    username: customer.username,
    customerId: customer.id,
    packageId: pkg.id,
    packageLabel: `${pkg.durationLabel} · ${pkg.telas} tela(s)${pkg.adult ? " · +18" : ""}`,
    amount: priceReais(pkg.priceCents),
    gclid,
  }).catch((e) => console.error("saveRenewalInit:", e));

  return NextResponse.json({
    id: tx.id,
    amount: tx.amount,
    status: tx.status,
    qrCode: tx.qrCode,
    qrCodeText: tx.qrCodeText,
    expiresAt: tx.expiresAt,
  });
}

// Consulta o status (usado no polling do modal).
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
  try {
    const tx = await getTransaction(id);
    return NextResponse.json({ id: tx.id, status: tx.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
