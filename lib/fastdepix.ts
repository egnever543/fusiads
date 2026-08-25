// ==========================================================================
// Cliente da API de PIX (FastDePix). Roda APENAS no servidor.
// A chave é secreta e vem de env (FASTDEPIX_API_KEY) — nunca no código.
// ==========================================================================

const BASE_URL = process.env.FASTDEPIX_BASE_URL ?? "https://fastdepix.space/api/v1";
const API_KEY = process.env.FASTDEPIX_API_KEY;

export type PixTransaction = {
  id: number | string;
  amount: number;
  status: string;
  qrCode: string | null; // URL da imagem do QR
  qrCodeText: string | null; // copia-e-cola
  expiresAt: string | null;
};

export function pixConfigured(): boolean {
  return Boolean(API_KEY);
}

function mapTx(d: any): PixTransaction {
  return {
    id: d.id,
    amount: Number(d.amount),
    status: String(d.status),
    qrCode: d.qr_code ?? null,
    qrCodeText: d.qr_code_text ?? null,
    expiresAt: d.qr_code_expires_at ?? null,
  };
}

export async function createTransaction(params: {
  amount: number;
  phone?: string;
  name?: string;
  notificationUrl?: string;
}): Promise<PixTransaction> {
  if (!API_KEY) throw new Error("FASTDEPIX_API_KEY não configurada.");
  const body: Record<string, unknown> = { amount: params.amount };
  if (params.phone) body.payer_phone = params.phone.replace(/\D/g, "");
  if (params.name) body.user = { name: params.name };
  if (params.notificationUrl) body.notification_url = params.notificationUrl;

  const res = await fetch(`${BASE_URL}/transactions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) throw new Error(json?.message ?? "Falha ao criar PIX.");
  return mapTx(json.data);
}

export async function getTransaction(id: number | string): Promise<PixTransaction> {
  if (!API_KEY) throw new Error("FASTDEPIX_API_KEY não configurada.");
  const res = await fetch(`${BASE_URL}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) throw new Error(json?.message ?? "Falha ao consultar PIX.");
  return mapTx(json.data);
}
