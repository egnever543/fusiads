import { getServiceClient } from "./config";

// ==========================================================================
// Agregações para o dashboard do /admin. Roda apenas no servidor (service_role).
// Duas fontes de receita:
//  - Renovações (checkout PIX): renewals com provisioned=true, por renewed_at.
//  - Vendas manuais (WhatsApp): leads com sold=true, por sold_at.
// Os valores já estão em reais.
// ==========================================================================

export type SaleRow = {
  id: string;
  when: string | null; // ISO
  label: string; // pacote / dispositivo
  who: string; // usuário / código do lead
  amount: number | null;
  hasClickId: boolean;
  source: "renovação" | "manual";
};

export type Bucket = { count: number; revenue: number };

export type DashboardData = {
  renewals: {
    today: Bucket;
    last7: Bucket;
    last30: Bucket;
    all: Bucket;
  };
  manual: {
    today: Bucket;
    last7: Bucket;
    last30: Bucket;
    all: Bucket;
  };
  leads: { total: number; sold: number; withGclid: number };
  daily: { date: string; revenue: number; count: number }[]; // últimos 14 dias (renovações)
  recent: SaleRow[]; // últimas vendas (renovações + manuais), mais recentes primeiro
};

const DAY = 86400000;

// Data no fuso do Brasil (YYYY-MM-DD) a partir de um ISO em UTC.
function brDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600000);
  return d.toISOString().slice(0, 10);
}

function emptyBucket(): Bucket {
  return { count: 0, revenue: 0 };
}

function addTo(b: Bucket, amount: number | null) {
  b.count += 1;
  b.revenue += Number.isFinite(Number(amount)) ? Number(amount) : 0;
}

export async function getDashboard(): Promise<DashboardData> {
  const client = getServiceClient();
  const base: DashboardData = {
    renewals: { today: emptyBucket(), last7: emptyBucket(), last30: emptyBucket(), all: emptyBucket() },
    manual: { today: emptyBucket(), last7: emptyBucket(), last30: emptyBucket(), all: emptyBucket() },
    leads: { total: 0, sold: 0, withGclid: 0 },
    daily: [],
    recent: [],
  };
  if (!client) return base;

  const now = Date.now();
  const todayStr = brDate(new Date(now).toISOString());
  const since7 = now - 7 * DAY;
  const since30 = now - 30 * DAY;

  // --- Renovações pagas ---
  const { data: renews } = await client
    .from("renewals")
    .select("transaction_id, username, package_label, amount, status, renewed_at, gclid, gbraid, wbraid")
    .eq("provisioned", true)
    .order("renewed_at", { ascending: false })
    .limit(5000);

  // Buckets diários dos últimos 14 dias (renovações).
  const dailyMap = new Map<string, { revenue: number; count: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = brDate(new Date(now - i * DAY).toISOString());
    dailyMap.set(d, { revenue: 0, count: 0 });
  }

  const recent: SaleRow[] = [];

  for (const r of renews ?? []) {
    const when = (r as { renewed_at: string | null }).renewed_at;
    const amount = Number((r as { amount: number | null }).amount ?? 0);
    const t = when ? new Date(when).getTime() : 0;
    addTo(base.renewals.all, amount);
    if (t >= since30) addTo(base.renewals.last30, amount);
    if (t >= since7) addTo(base.renewals.last7, amount);
    if (when && brDate(when) === todayStr) addTo(base.renewals.today, amount);

    if (when) {
      const key = brDate(when);
      const slot = dailyMap.get(key);
      if (slot) {
        slot.revenue += amount;
        slot.count += 1;
      }
    }

    recent.push({
      id: String((r as { transaction_id: string }).transaction_id),
      when,
      label: (r as { package_label: string | null }).package_label ?? "Renovação",
      who: (r as { username: string }).username ?? "",
      amount,
      hasClickId: Boolean(
        (r as { gclid?: string | null }).gclid ||
          (r as { gbraid?: string | null }).gbraid ||
          (r as { wbraid?: string | null }).wbraid
      ),
      source: "renovação",
    });
  }

  base.daily = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

  // --- Vendas manuais (leads marcados como vendidos) ---
  const { data: soldLeads } = await client
    .from("leads")
    .select("id, device, sale_value, sold_at, gclid")
    .eq("sold", true)
    .order("sold_at", { ascending: false })
    .limit(5000);

  for (const l of soldLeads ?? []) {
    const when = (l as { sold_at: string | null }).sold_at;
    const amount = Number((l as { sale_value: number | null }).sale_value ?? 0);
    const t = when ? new Date(when).getTime() : 0;
    addTo(base.manual.all, amount);
    if (t >= since30) addTo(base.manual.last30, amount);
    if (t >= since7) addTo(base.manual.last7, amount);
    if (when && brDate(when) === todayStr) addTo(base.manual.today, amount);

    recent.push({
      id: String((l as { id: string }).id),
      when,
      label: (l as { device: string | null }).device ?? "Venda manual",
      who: String((l as { id: string }).id),
      amount,
      hasClickId: Boolean((l as { gclid?: string | null }).gclid),
      source: "manual",
    });
  }

  // --- Contagens de leads (funil) ---
  const totalQ = await client.from("leads").select("*", { count: "exact", head: true });
  const soldQ = await client.from("leads").select("*", { count: "exact", head: true }).eq("sold", true);
  const gclidQ = await client
    .from("leads")
    .select("*", { count: "exact", head: true })
    .not("gclid", "is", null);
  base.leads = {
    total: totalQ.count ?? 0,
    sold: soldQ.count ?? 0,
    withGclid: gclidQ.count ?? 0,
  };

  // Ordena as vendas recentes (renovações + manuais) por data desc e corta em 25.
  recent.sort((a, b) => {
    const ta = a.when ? new Date(a.when).getTime() : 0;
    const tb = b.when ? new Date(b.when).getTime() : 0;
    return tb - ta;
  });
  base.recent = recent.slice(0, 25);

  return base;
}
