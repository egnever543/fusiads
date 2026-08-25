// ==========================================================================
// Cliente da API do Sigma (painel de provisionamento). Roda APENAS no
// servidor. O token é secreto e vem de env (SIGMA_API_TOKEN) — nunca no código.
// ==========================================================================

const BASE_URL = process.env.SIGMA_BASE_URL ?? "https://sistema.ftspanel.vip/api/integration/v1";
const TOKEN = process.env.SIGMA_API_TOKEN;

export type SigmaCustomer = {
  id: string; // hashid (customerId usado na renovação)
  username: string;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" | string;
  expires_at: string | null;
  connections: number; // telas
  package_is_adult: boolean;
  package: string | null; // nome decorado do pacote
};

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function sigmaConfigured(): boolean {
  return Boolean(TOKEN);
}

// Busca um cliente pelo username exato. Retorna null se não encontrar.
// NUNCA exponha o objeto inteiro ao navegador (ele traz o password).
export async function findCustomerByUsername(username: string): Promise<SigmaCustomer | null> {
  if (!TOKEN || !username) return null;
  const u = username.trim();
  const url = `${BASE_URL}/customers?username=${encodeURIComponent(u)}&per_page=20`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const list: any[] = Array.isArray(json?.data) ? json.data : [];
  // O filtro do Sigma pode ser parcial (LIKE), então pegamos o match exato.
  const c = list.find((x) => String(x?.username).toLowerCase() === u.toLowerCase());
  if (!c) return null;
  return {
    id: String(c.id),
    username: String(c.username),
    status: String(c.status),
    expires_at: c.expires_at ?? c.expires_at_tz ?? null,
    connections: Number(c.connections) || 1,
    package_is_adult: Boolean(c.package_is_adult),
    package: c.package ?? null,
  };
}

// Renova (estende) um cliente existente pelo packageId escolhido.
// O Sigma estende o vencimento pela duração do pacote (expiresAt é opcional).
export async function renewCustomer(
  customerId: string,
  packageId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN) return { ok: false, error: "SIGMA_API_TOKEN não configurada." };
  const res = await fetch(`${BASE_URL}/customers/${encodeURIComponent(customerId)}/renew`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ packageId }),
    cache: "no-store",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return { ok: false, error: (j as any)?.message ?? `Falha ao renovar (HTTP ${res.status}).` };
  }
  return { ok: true };
}
