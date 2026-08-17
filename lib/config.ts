import { createClient } from "@supabase/supabase-js";

// ==========================================================================
// Tipos e valores padrao da configuracao do site.
// ==========================================================================

export type PhoneEntry = {
  // Numero em formato internacional, so digitos. Ex: 5511999998888
  number: string;
  // Peso relativo para a divisao de trafego. Maior = recebe mais cliques.
  weight: number;
  enabled: boolean;
  // Rotulo opcional so pra voce se organizar no painel (ex: "Vendedor 1").
  label?: string;
};

export type SiteConfig = {
  // Ate 4 numeros de WhatsApp para dividir o trafego.
  phones: PhoneEntry[];
  // Mensagem pre-preenchida ao abrir o WhatsApp.
  whatsappMessage: string;
  // ID do Google Ads (ex: "AW-123456789").
  googleAdsId: string;
  // Rotulo da conversao (ex: "AbCdEfGhIj"). Dispara no clique do WhatsApp.
  conversionLabel: string;
};

export const DEFAULT_CONFIG: SiteConfig = {
  phones: [
    { number: "", weight: 1, enabled: false, label: "Número 1" },
    { number: "", weight: 1, enabled: false, label: "Número 2" },
    { number: "", weight: 1, enabled: false, label: "Número 3" },
    { number: "", weight: 1, enabled: false, label: "Número 4" },
  ],
  whatsappMessage: "Olá! Quero testar a PREMIUM TV.",
  googleAdsId: "AW-17909477604",
  conversionLabel: "",
};

// Mescla o que veio do banco com os defaults, garantindo formato correto.
export function normalizeConfig(raw: Partial<SiteConfig> | null | undefined): SiteConfig {
  const merged = { ...DEFAULT_CONFIG, ...(raw ?? {}) };
  const phones = Array.isArray(raw?.phones) ? raw!.phones : DEFAULT_CONFIG.phones;
  const normalizedPhones: PhoneEntry[] = [];
  for (let i = 0; i < 4; i++) {
    const p = phones[i] ?? {};
    normalizedPhones.push({
      number: String(p.number ?? "").replace(/\D/g, ""),
      weight: Number.isFinite(Number(p.weight)) && Number(p.weight) > 0 ? Number(p.weight) : 1,
      enabled: Boolean(p.enabled),
      label: p.label ?? `Número ${i + 1}`,
    });
  }
  return { ...merged, phones: normalizedPhones };
}

// ==========================================================================
// Clientes Supabase
// ==========================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function readClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

function writeClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ==========================================================================
// Leitura / gravacao da configuracao
// ==========================================================================

// Le a configuracao. Se o Supabase nao estiver configurado ou der erro,
// devolve os defaults pra o site nunca quebrar.
export async function getConfig(): Promise<SiteConfig> {
  const client = readClient();
  if (!client) return DEFAULT_CONFIG;
  try {
    const { data, error } = await client
      .from("site_config")
      .select("data")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return normalizeConfig((data?.data as Partial<SiteConfig>) ?? null);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string };

// Grava a configuracao usando a chave service_role (apenas no servidor).
export async function saveConfig(config: SiteConfig): Promise<SaveResult> {
  const client = writeClient();
  if (!client) {
    return {
      ok: false,
      error:
        "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    };
  }
  const clean = normalizeConfig(config);
  const { error } = await client
    .from("site_config")
    .upsert({ id: 1, data: clean, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
