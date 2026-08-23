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
  // Nome EXATO da acao de conversao offline no Google Ads. Vai na coluna
  // "Conversion Name" do CSV exportado em /vendas.
  offlineConversionName: string;
  // Nome do app (usado no tutorial "Como baixar o app").
  appName: string;
  // URL da logo do app (mostrada no tutorial para o cliente reconhecer o icone).
  appLogoUrl: string;
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
  offlineConversionName: "",
  appName: "PREMIUM TV",
  appLogoUrl: "https://cinebrasil.top/wp-content/uploads/2025/10/IPTV-MODELO02-B02-1024x1024-1.webp",
};

// Extrai o ID do Google Ads (AW-XXXX). Aceita o ID puro OU o snippet inteiro
// colado (ex: <script ... id=AW-123></script>), pegando o primeiro AW-XXXX.
export function sanitizeAdsId(value: unknown): string {
  const s = String(value ?? "").trim();
  const m = s.match(/AW-\d+/i);
  return m ? m[0].toUpperCase() : s;
}

// Normaliza o rotulo da conversao. Aceita "AW-123/AbCdEf" (pega o depois da
// barra) ou apenas "AbCdEf". Remove aspas acidentais.
export function sanitizeConversionLabel(value: unknown): string {
  let s = String(value ?? "").trim().replace(/['"]/g, "");
  if (s.includes("/")) s = s.split("/").pop()!.trim();
  return s;
}

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
  return {
    ...merged,
    googleAdsId: sanitizeAdsId(merged.googleAdsId),
    conversionLabel: sanitizeConversionLabel(merged.conversionLabel),
    offlineConversionName: String(merged.offlineConversionName ?? "").trim(),
    appName: String(merged.appName ?? "").trim() || DEFAULT_CONFIG.appName,
    appLogoUrl: String(merged.appLogoUrl ?? "").trim(),
    phones: normalizedPhones,
  };
}

// ==========================================================================
// Clientes Supabase
// ==========================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Evita o cache de fetch do Next/Vercel: sempre le o valor mais recente do
// Supabase (senao, ao trocar a config no /admin, o front continua servindo o
// valor antigo ate o cache expirar).
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

function readClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  });
}

function writeClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  });
}

// ==========================================================================
// Leitura / gravacao da configuracao
// ==========================================================================

// Le a configuracao. Roda APENAS no servidor (Server Components / rotas), entao
// prefere a chave service_role e cai para a anon como fallback. Assim o front
// nao depende da chave anon estar configurada. Se nada estiver disponivel ou
// der erro, devolve os defaults pra o site nunca quebrar.
export async function getConfig(): Promise<SiteConfig> {
  const client = writeClient() ?? readClient();
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

// ==========================================================================
// Leads (visitantes que concluiram o fluxo de chat)
// ==========================================================================

export type LeadInput = {
  id: string;
  device?: string;
  path?: string[];
  gclid?: string;
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  user_agent?: string;
};

function clip(v: unknown, max = 500): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

// Grava um lead usando a chave service_role (apenas no servidor).
export async function insertLead(lead: LeadInput): Promise<{ ok: boolean; error?: string }> {
  const client = writeClient();
  if (!client) return { ok: false, error: "Supabase não configurado." };
  if (!lead?.id) return { ok: false, error: "ID ausente." };

  const row = {
    id: clip(lead.id, 64),
    device: clip(lead.device),
    path: Array.isArray(lead.path) ? lead.path.slice(0, 20) : null,
    gclid: clip(lead.gclid, 2000),
    fbclid: clip(lead.fbclid, 2000),
    utm_source: clip(lead.utm_source),
    utm_medium: clip(lead.utm_medium),
    utm_campaign: clip(lead.utm_campaign),
    utm_content: clip(lead.utm_content),
    utm_term: clip(lead.utm_term),
    referrer: clip(lead.referrer, 2000),
    user_agent: clip(lead.user_agent, 1000),
  };

  const { error } = await client.from("leads").upsert(row, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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

// ==========================================================================
// Vendas (recuperar um lead pelo codigo e registrar a venda)
// ==========================================================================

export type Lead = {
  id: string;
  device: string | null;
  path: string[] | null;
  gclid: string | null;
  fbclid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  user_agent: string | null;
  created_at: string | null;
  sold: boolean | null;
  sale_value: number | null;
  currency: string | null;
  sold_at: string | null;
};

const LEAD_COLUMNS =
  "id, device, path, gclid, fbclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, user_agent, created_at, sold, sale_value, currency, sold_at";

// Busca um lead pelo codigo (id). Roda apenas no servidor.
export async function getLead(id: string): Promise<Lead | null> {
  const client = writeClient();
  if (!client || !id) return null;
  const code = id.trim();
  const { data, error } = await client
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", code)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Lead;
}

export type SaleInput = {
  id: string;
  sold: boolean;
  value?: number | null;
  currency?: string;
  soldAt?: string; // ISO
};

// Registra (ou desfaz) a venda de um lead.
export async function updateLeadSale(
  input: SaleInput
): Promise<{ ok: boolean; error?: string }> {
  const client = writeClient();
  if (!client) return { ok: false, error: "Supabase não configurado." };
  const code = String(input.id ?? "").trim();
  if (!code) return { ok: false, error: "Código ausente." };

  const row: Record<string, unknown> = {
    sold: Boolean(input.sold),
    sale_value: input.sold ? (Number.isFinite(Number(input.value)) ? Number(input.value) : null) : null,
    currency: input.sold ? (input.currency || "BRL") : null,
    sold_at: input.sold ? (input.soldAt || new Date().toISOString()) : null,
  };

  const { error } = await client.from("leads").update(row).eq("id", code);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Lista os leads vendidos (com gclid) para exportar ao Google Ads.
// Filtra por data da venda (sold_at) quando informado.
export async function listSoldLeads(opts: {
  from?: string;
  to?: string;
  onlyWithGclid?: boolean;
}): Promise<Lead[]> {
  const client = writeClient();
  if (!client) return [];
  let query = client
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("sold", true)
    .order("sold_at", { ascending: true })
    .limit(5000);

  if (opts.from) query = query.gte("sold_at", opts.from);
  if (opts.to) query = query.lte("sold_at", opts.to);

  const { data, error } = await query;
  if (error || !data) return [];
  let rows = data as unknown as Lead[];
  if (opts.onlyWithGclid) rows = rows.filter((r) => r.gclid);
  return rows;
}
