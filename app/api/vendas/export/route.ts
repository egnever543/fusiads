import { isAuthenticated } from "@/lib/auth";
import { listSoldLeads, getConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Formata um instante (UTC) no fuso do Brasil, com o offset no proprio texto
// (ex: "2026-08-22 11:00:00-03:00"). O Data Manager aceita o fuso na coluna.
function fmtTimeBR(iso: string | null): string {
  if (!iso) return "";
  const utc = new Date(iso);
  const br = new Date(utc.getTime() - 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${br.getUTCFullYear()}-${p(br.getUTCMonth() + 1)}-${p(br.getUTCDate())} ` +
    `${p(br.getUTCHours())}:${p(br.getUTCMinutes())}:${p(br.getUTCSeconds())}-03:00`
  );
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Confere a senha vinda por HTTP Basic (usuario:senha). O Google Ads envia
// usuario/senha; aqui a SENHA precisa ser igual ao EXPORT_TOKEN (o usuario
// pode ser qualquer coisa).
function basicPasswordOk(request: Request, expected?: string): boolean {
  if (!expected) return false;
  const h = request.headers.get("authorization") || "";
  if (!h.toLowerCase().startsWith("basic ")) return false;
  try {
    const decoded = Buffer.from(h.slice(6), "base64").toString("utf8");
    const pass = decoded.slice(decoded.indexOf(":") + 1);
    return pass === expected;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Autoriza de 3 formas: login (download manual), token na URL, ou
  // usuario/senha HTTP Basic (usado pelo agendamento do Google Ads).
  const envToken = process.env.EXPORT_TOKEN;
  const token = url.searchParams.get("token");
  const authorized =
    isAuthenticated() ||
    (Boolean(envToken) && token === envToken) ||
    basicPasswordOk(request, envToken);
  if (!authorized) {
    return new Response("Não autenticado", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="vendas"' },
    });
  }

  const fromRaw = url.searchParams.get("from") || undefined;
  const toRaw = url.searchParams.get("to") || undefined;
  const daysRaw = url.searchParams.get("days");
  // Datas (yyyy-mm-dd) viram intervalo de dia inteiro em UTC.
  let from = fromRaw ? `${fromRaw}T00:00:00.000Z` : undefined;
  const to = toRaw ? `${toRaw}T23:59:59.999Z` : undefined;
  // Janela deslizante opcional: ?days=90 => ultimos 90 dias (util no agendamento).
  if (!from && daysRaw) {
    const d = Number(daysRaw);
    if (Number.isFinite(d) && d > 0) {
      from = new Date(Date.now() - d * 86400000).toISOString();
    }
  }

  const config = await getConfig();
  const conversionName = config.offlineConversionName || "Conversão Offline";

  const leads = await listSoldLeads({ from, to, onlyWithGclid: true });

  const lines: string[] = [];
  // Cabecalho como PRIMEIRA linha (o Data Manager le a linha 1 como cabecalho).
  // O fuso vai dentro de cada Conversion Time, nao numa linha "Parameters".
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

  // Sem vendas ainda: inclui UMA linha de exemplo para o Google Ads conseguir
  // detectar o esquema ao conectar. O gclid falso nao casa com nenhum clique,
  // entao nao credita conversao. Some assim que houver vendas reais.
  if (leads.length === 0) {
    lines.push(
      [
        csvEscape("EXEMPLO_SEM_VENDAS"),
        csvEscape(conversionName),
        csvEscape(fmtTimeBR(new Date().toISOString())),
        csvEscape("1"),
        csvEscape("BRL"),
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
