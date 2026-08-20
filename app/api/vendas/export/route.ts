import { isAuthenticated } from "@/lib/auth";
import { listSoldLeads, getConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Formata um instante (UTC) no fuso do Brasil (-03:00), sem offset no texto,
// para casar com "Parameters:TimeZone=-0300" no CSV.
function fmtTimeBR(iso: string | null): string {
  if (!iso) return "";
  const utc = new Date(iso);
  const br = new Date(utc.getTime() - 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${br.getUTCFullYear()}-${p(br.getUTCMonth() + 1)}-${p(br.getUTCDate())} ` +
    `${p(br.getUTCHours())}:${p(br.getUTCMinutes())}:${p(br.getUTCSeconds())}`
  );
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(request: Request) {
  if (!isAuthenticated()) {
    return new Response("Não autenticado", { status: 401 });
  }

  const url = new URL(request.url);
  const fromRaw = url.searchParams.get("from") || undefined;
  const toRaw = url.searchParams.get("to") || undefined;
  // Datas (yyyy-mm-dd) viram intervalo de dia inteiro em UTC.
  const from = fromRaw ? `${fromRaw}T00:00:00.000Z` : undefined;
  const to = toRaw ? `${toRaw}T23:59:59.999Z` : undefined;

  const config = await getConfig();
  const conversionName = config.offlineConversionName || "Conversão Offline";

  const leads = await listSoldLeads({ from, to, onlyWithGclid: true });

  const lines: string[] = [];
  // Cabecalho no formato de importacao de conversoes offline do Google Ads.
  lines.push("Parameters:TimeZone=-0300");
  lines.push("Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency");
  for (const l of leads) {
    lines.push(
      [
        csvEscape(l.gclid ?? ""),
        csvEscape(conversionName),
        csvEscape(fmtTimeBR(l.sold_at)),
        csvEscape(l.sale_value != null ? String(l.sale_value) : ""),
        csvEscape(l.currency ?? "BRL"),
      ].join(",")
    );
  }

  const csv = lines.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="conversoes-google-ads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
