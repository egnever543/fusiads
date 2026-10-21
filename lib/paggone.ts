// ==========================================================================
// Adaptador da API de PIX da paggOne. Roda APENAS no servidor.
// A chave é secreta (tabela `secrets` do Supabase, fallback PAGGONE_API_KEY).
// Doc: POST /pix (cash-in) e GET /pix/{id} (status). Valores em CENTAVOS.
// ==========================================================================

import { getSecret } from "./secrets";
import type { PixTransaction, CreateParams, PixStatus } from "./pix-types";

// Produção por padrão. Para testar, aponte PAGGONE_BASE_URL para o sandbox:
// https://sandbox-api.paggpay.com/v1
const BASE_URL = process.env.PAGGONE_BASE_URL ?? "https://api.paggone.com/v1";

async function getKey(): Promise<string | undefined> {
  return getSecret("paggone_api_key", "PAGGONE_API_KEY");
}

export async function pixConfigured(): Promise<boolean> {
  return Boolean(await getKey());
}

// Normaliza o status da transação da paggOne para o status único do sistema.
function normalizeStatus(raw: unknown): PixStatus {
  const s = String(raw ?? "").toLowerCase();
  if (s === "succeeded" || s === "paid" || s === "approved" || s === "completed") return "paid";
  if (s === "pending" || s === "created" || s === "processing" || s === "waiting") return "pending";
  if (s === "expired") return "expired";
  if (s === "failed" || s === "refunded" || s === "partially_refunded" || s === "refund_pending" || s === "canceled")
    return "failed";
  return "unknown";
}

// A resposta de /pix e /pix/{id} tem o formato PixTransaction:
// { data: { pix: { id, status, value(centavos), qrcode, code, expiration_date },
//           transaction: { id: "txn_...", status, currency_code, reference_id } } }
function mapTx(payload: any): PixTransaction {
  const data = payload?.data ?? payload ?? {};
  const pix = data.pix ?? {};
  const transaction = data.transaction ?? {};
  // Usamos o id da TRANSAÇÃO (txn_...) como id canônico: é o que aparece no
  // webhook (data.id) e identifica a transação para consulta.
  const id = String(transaction.id ?? pix.id ?? "");
  // Preferimos o status da transação; caímos para o do pix se faltar.
  const status = normalizeStatus(transaction.status ?? pix.status);
  const cents = Number(pix.value ?? transaction.amount ?? 0);
  return {
    id,
    amount: Number.isFinite(cents) ? cents / 100 : 0,
    status,
    qrCode: pix.qrcode ?? null,
    qrCodeText: pix.code ?? null,
    expiresAt: pix.expiration_date ?? null,
  };
}

export async function createTransaction(params: CreateParams): Promise<PixTransaction> {
  const API_KEY = await getKey();
  if (!API_KEY) throw new Error("paggOne não configurada.");

  const body: Record<string, unknown> = {
    // Valor em centavos. O pagador paga este valor (taxa deduzida do recebível).
    value: Math.round(Number(params.amount) * 100),
  };
  if (params.referenceId) body.reference_id = params.referenceId;
  if (params.name) body.payer_name = params.name;
  if (params.phone) body.payer_phone = params.phone.replace(/\D/g, "");
  if (params.notificationUrl) body.webhook_url = params.notificationUrl;

  const res = await fetch(`${BASE_URL}/pix`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json?.message as string) ?? "Falha ao criar PIX (paggOne).");
  }
  return mapTx(json);
}

export async function getTransaction(id: string | number): Promise<PixTransaction> {
  const API_KEY = await getKey();
  if (!API_KEY) throw new Error("paggOne não configurada.");
  const res = await fetch(`${BASE_URL}/pix/${encodeURIComponent(String(id))}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json?.message as string) ?? "Falha ao consultar PIX (paggOne).");
  }
  return mapTx(json);
}
