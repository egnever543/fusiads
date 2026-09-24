import { getServiceClient } from "./config";

// ==========================================================================
// Renovações (compras de renovação via checkout). Roda apenas no servidor.
// A idempotência do provisionamento usa um "claim" atômico (ver claimRenewal).
// ==========================================================================

export type Renewal = {
  transaction_id: string;
  username: string;
  customer_id: string;
  package_id: string;
  package_label: string | null;
  amount: number;
  status: string;
  provisioned: boolean;
  provisioning: boolean;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  created_at: string | null;
  renewed_at: string | null;
};

const COLS =
  "transaction_id, username, customer_id, package_id, package_label, amount, status, provisioned, provisioning, gclid, gbraid, wbraid, created_at, renewed_at";

export async function saveRenewalInit(input: {
  transactionId: string;
  username: string;
  customerId: string;
  packageId: string;
  packageLabel?: string;
  amount: number;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const client = getServiceClient();
  if (!client) return { ok: false, error: "Supabase não configurado." };
  const { error } = await client.from("renewals").upsert(
    {
      transaction_id: input.transactionId,
      username: input.username,
      customer_id: input.customerId,
      package_id: input.packageId,
      package_label: input.packageLabel ?? null,
      amount: input.amount,
      status: "pending",
      gclid: input.gclid ?? null,
      gbraid: input.gbraid ?? null,
      wbraid: input.wbraid ?? null,
    },
    { onConflict: "transaction_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Lista as renovacoes PAGAS (provisionadas) para o feed de conversoes offline
// do Google Ads. Filtra pela data do pagamento (renewed_at). Por padrao o feed
// pede as ultimas 24h; datas explicitas (from/to) ou uma janela em horas.
export async function listPaidRenewals(opts: {
  from?: string;
  to?: string;
  onlyWithClickId?: boolean;
}): Promise<Renewal[]> {
  const client = getServiceClient();
  if (!client) return [];
  let query = client
    .from("renewals")
    .select(COLS)
    .eq("provisioned", true)
    .order("renewed_at", { ascending: true })
    .limit(5000);

  if (opts.from) query = query.gte("renewed_at", opts.from);
  if (opts.to) query = query.lte("renewed_at", opts.to);

  const { data, error } = await query;
  if (error || !data) return [];
  let rows = data as unknown as Renewal[];
  if (opts.onlyWithClickId) rows = rows.filter((r) => r.gclid || r.gbraid || r.wbraid);
  return rows;
}

export async function getRenewal(transactionId: string): Promise<Renewal | null> {
  const client = getServiceClient();
  if (!client) return null;
  const { data, error } = await client
    .from("renewals")
    .select(COLS)
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Renewal;
}

// Claim atômico: só o PRIMEIRO chamador consegue "travar" (provisioning=true).
// O UPDATE condicional garante que renovação nunca aconteça duas vezes, mesmo
// que polling do cliente e webhook do provedor cheguem juntos.
export async function claimRenewal(transactionId: string): Promise<boolean> {
  const client = getServiceClient();
  if (!client) return false;
  const { data, error } = await client
    .from("renewals")
    .update({ provisioning: true })
    .eq("transaction_id", transactionId)
    .eq("provisioned", false)
    .eq("provisioning", false)
    .select("transaction_id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export async function releaseRenewal(transactionId: string): Promise<void> {
  const client = getServiceClient();
  if (!client) return;
  await client
    .from("renewals")
    .update({ provisioning: false })
    .eq("transaction_id", transactionId);
}

export async function markRenewed(transactionId: string): Promise<void> {
  const client = getServiceClient();
  if (!client) return;
  await client
    .from("renewals")
    .update({ provisioned: true, provisioning: false, status: "paid", renewed_at: new Date().toISOString() })
    .eq("transaction_id", transactionId);
}
