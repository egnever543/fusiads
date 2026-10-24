import { NextResponse } from "next/server";
import { getConfig, getLead } from "@/lib/config";
import { getPackage, priceReais, packageCredits } from "@/lib/packages";
import { findCustomerByUsername, sigmaConfigured, getUserCredits } from "@/lib/sigma";
import { createTransaction, getTransaction, pixConfigured } from "@/lib/pix";
import { getRenewal, saveRenewalInit } from "@/lib/renewals";
import { normalizeProvider } from "@/lib/pix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cria a cobrança PIX para renovar um cliente. O VALOR vem do servidor (pacote),
// nunca do cliente.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim();
  const packageId = String(body?.packageId ?? "").trim();
  let gclid = body?.gclid ? String(body.gclid) : null;
  let gbraid = body?.gbraid ? String(body.gbraid) : null;
  let wbraid = body?.wbraid ? String(body.wbraid) : null;
  const leadId = body?.leadId ? String(body.leadId).trim() : "";

  // Se não veio identificador direto na URL, recupera pelo código do lead
  // (PT-XXXX) capturado na landing — o clique do anúncio ficou salvo lá.
  if (leadId && !gclid && !gbraid && !wbraid) {
    const lead = await getLead(leadId);
    if (lead) {
      gclid = lead.gclid ?? null;
      gbraid = lead.gbraid ?? null;
      wbraid = lead.wbraid ?? null;
    }
  }

  const config = await getConfig();
  if (!config.payments.pix) {
    return NextResponse.json({ error: "Pagamento PIX indisponível." }, { status: 400 });
  }
  const provider = config.payments.pixProvider;
  if (!(await pixConfigured(provider)) || !sigmaConfigured()) {
    return NextResponse.json({ error: "Pagamento não configurado." }, { status: 500 });
  }

  const pkg = getPackage(packageId);
  if (!pkg) return NextResponse.json({ error: "Pacote inválido." }, { status: 400 });

  const customer = await findCustomerByUsername(username);
  if (!customer) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  // Revendedor sem saldo não pode renovar: barramos ANTES de cobrar o cliente,
  // pra não receber um pagamento que não poderá ser provisionado. Se não der
  // pra determinar o saldo (conta ilimitada/erro), seguimos — o provisionamento
  // ainda valida o saldo antes de renovar.
  const credits = packageCredits(pkg);
  if (customer.reseller_id && credits > 0) {
    const bal = await getUserCredits(customer.reseller_id);
    if (bal.ok && bal.credits !== null && bal.credits < credits) {
      return NextResponse.json(
        { error: "Renovação indisponível no momento. Fale com o suporte." },
        { status: 409 }
      );
    }
  }

  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const notificationUrl = host ? `${proto}://${host}/api/webhook` : undefined;

  let tx;
  try {
    tx = await createTransaction(provider, {
      amount: priceReais(pkg.priceCents),
      notificationUrl,
      referenceId: customer.username,
    });
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
    gbraid,
    wbraid,
    provider,
    resellerId: customer.reseller_id,
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

// Consulta o status (usado no polling do modal). O provedor é descoberto pela
// renovação salva (fonte confiável), caindo para o provedor atual da config.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
  try {
    const renewal = await getRenewal(id);
    const config = await getConfig();
    const provider = normalizeProvider(renewal?.provider ?? config.payments.pixProvider);
    const tx = await getTransaction(provider, id);
    return NextResponse.json({ id: tx.id, status: tx.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
