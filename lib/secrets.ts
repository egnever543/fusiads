import { getServiceClient } from "./config";

// ==========================================================================
// Segredos (tokens) guardados no Supabase, na tabela protegida `secrets`.
// Lidos APENAS no servidor (service_role). NUNCA envie estes valores ao
// navegador nem os coloque em site_config (que tem leitura pública).
// ==========================================================================

// Lê um segredo por chave. Cai para a env var equivalente se não houver no banco.
export async function getSecret(key: string, envFallback?: string): Promise<string | undefined> {
  const client = getServiceClient();
  if (client) {
    const { data, error } = await client.from("secrets").select("data").eq("id", 1).maybeSingle();
    if (!error && data) {
      const v = (data.data as Record<string, unknown>)?.[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  const env = envFallback ? process.env[envFallback] : undefined;
  return env && env.trim() ? env.trim() : undefined;
}

// Status (só booleanos) para exibir no /admin — nunca devolve o valor.
export async function getSecretsStatus(): Promise<{ fastdepix: boolean }> {
  return {
    fastdepix: Boolean(await getSecret("fastdepix_api_key", "FASTDEPIX_API_KEY")),
  };
}

// Grava/atualiza segredos. Só sobrescreve chaves que vierem com valor
// (string não vazia) — campos em branco mantêm o valor atual.
export async function saveSecrets(
  patch: Record<string, string | undefined | null>
): Promise<{ ok: boolean; error?: string }> {
  const client = getServiceClient();
  if (!client) return { ok: false, error: "Supabase não configurado." };

  const { data } = await client.from("secrets").select("data").eq("id", 1).maybeSingle();
  const current = (data?.data as Record<string, unknown>) ?? {};
  const next: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "string" && v.trim()) next[k] = v.trim();
  }

  const { error } = await client
    .from("secrets")
    .upsert({ id: 1, data: next, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
