// ==========================================================================
// Adaptador da API de PIX da AtivoPay. Roda APENAS no servidor.
// A chave é secreta (tabela `secrets`, fallback ATIVOPAY_API_KEY).
// Doc: POST /api/user/transactions (cria) e GET /api/user/transactions/{id}.
// Autenticação por header x-api-key + User-Agent fixo. Valores em CENTAVOS.
// ==========================================================================

import { getSecret } from "./secrets";
import type { PixTransaction, CreateParams, PixStatus } from "./pix-types";

const BASE_URL = process.env.ATIVOPAY_BASE_URL ?? "https://api-gateway.ativopay.com";
const USER_AGENT = "AtivoB2B/1.0";

// A AtivoPay exige dados do cliente na cobrança, mas não os valida. Como o
// checkout de renovação não coleta esses dados, enviamos um cliente fictício.
const PLACEHOLDER_CUSTOMER = {
  name: "Cliente",
  email: "cliente@exemplo.com",
  phone: "11999999999",
  document: { type: "CPF", number: "00000000000" },
};

async function getKey(): Promise<string | undefined> {
  return getSecret("ativopay_api_key", "ATIVOPAY_API_KEY");
}

export async function pixConfigured(): Promise<boolean> {
  return Boolean(await getKey());
}

// Normaliza o status da AtivoPay para o status único do sistema.
// Possíveis: processing, authorized, paid, refunded, waiting_payment,
// refused, chargeback, canceled, in_protest, expired.
function normalizeStatus(raw: unknown): PixStatus {
  const s = String(raw ?? "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "waiting_payment" || s === "processing" || s === "authorized") return "pending";
  if (s === "expired") return "expired";
  if (["refused", "refunded", "chargeback", "canceled", "in_protest"].includes(s)) return "failed";
  return "unknown";
}

// Mapeia a transação da AtivoPay (campo `data`) para o formato comum.
function mapTx(payload: any): PixTransaction {
  const d = payload?.data ?? payload ?? {};
  const pix = d.pix ?? {};
  const cents = Number(d.amount ?? 0);
  return {
    id: String(d.id ?? ""),
    amount: Number.isFinite(cents) ? cents / 100 : 0,
    status: normalizeStatus(d.status),
    qrCode: d.qrCode ?? null, // URL da imagem do QR
    qrCodeText: pix.qrcode ?? null, // copia-e-cola (EMV)
    expiresAt: pix.expirationDate ?? null,
  };
}

function headers(apiKey: string): HeadersInit {
  return {
    "x-api-key": apiKey,
    "User-Agent": USER_AGENT,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function createTransaction(params: CreateParams): Promise<PixTransaction> {
  const API_KEY = await getKey();
  if (!API_KEY) throw new Error("AtivoPay não configurada.");

  const cents = Math.round(Number(params.amount) * 100);
  const body = {
    pix: { expiresInDays: 1 },
    items: [
      {
        title: "Renovação",
        quantity: 1,
        tangible: false,
        unitPrice: cents,
        ...(params.referenceId ? { externalRef: params.referenceId } : {}),
      },
    ],
    amount: cents,
    currency: "BRL",
    customer: PLACEHOLDER_CUSTOMER,
    metadata: "",
    traceable: false,
    ...(params.notificationUrl ? { postbackUrl: params.notificationUrl } : {}),
    paymentMethod: "PIX",
  };

  const res = await fetch(`${BASE_URL}/api/user/transactions`, {
    method: "POST",
    headers: headers(API_KEY),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json?.message as string) ?? "Falha ao criar PIX (AtivoPay).");
  }
  return mapTx(json);
}

export async function getTransaction(id: string | number): Promise<PixTransaction> {
  const API_KEY = await getKey();
  if (!API_KEY) throw new Error("AtivoPay não configurada.");
  const res = await fetch(`${BASE_URL}/api/user/transactions/${encodeURIComponent(String(id))}`, {
    headers: headers(API_KEY),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json?.message as string) ?? "Falha ao consultar PIX (AtivoPay).");
  }
  return mapTx(json);
}
