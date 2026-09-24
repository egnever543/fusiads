import { isAuthenticated } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { listPaidRenewals } from "@/lib/renewals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================================================
// Feed de conversões offline do Google Ads (importação agendada por HTTPS).
// A cada chamada devolve as RENOVAÇÕES PAGAS (checkout PIX confirmado) da
// janela pedida — por padrão as últimas 24h. O Google Ads baixa este .csv
// periodicamente usando HTTP Basic Auth e credita a conversão pelo clique
// (gclid/gbraid/wbraid) capturado na URL do checkout.
// ==========================================================================

// Formata um instante (UTC) no fuso do Brasil, com o offset no próprio texto
// (ex: "2026-08-22 11:00:00-03:00"). O Google aceita o fuso na coluna.
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
      headers: { "WWW-Authenticate": 'Basic realm="conversions"' },
    });
  }

  // Janela de tempo. Prioridade: datas explícitas (from/to) > ?days= > ?hours=.
  // Sem nenhum parâmetro, usa as últimas 24h (recomendado pelo Google para o
  // agendamento — a deduplicação por Order ID evita contar duas vezes).
  const fromRaw = url.searchParams.get("from") || undefined;
  const toRaw = url.searchParams.get("to") || undefined;
  const daysRaw = url.searchParams.get("days");
  const hoursRaw = url.searchParams.get("hours");

  let from = fromRaw ? `${fromRaw}T00:00:00.000Z` : undefined;
  const to = toRaw ? `${toRaw}T23:59:59.999Z` : undefined;
  if (!from) {
    const days = Number(daysRaw);
    const hours = Number(hoursRaw);
    if (daysRaw && Number.isFinite(days) && days > 0) {
      from = new Date(Date.now() - days * 86400000).toISOString();
    } else if (hoursRaw && Number.isFinite(hours) && hours > 0) {
      from = new Date(Date.now() - hours * 3600000).toISOString();
    } else {
      // Padrão: últimas 24h.
      from = new Date(Date.now() - 24 * 3600000).toISOString();
    }
  }

  const config = await getConfig();
  const conversionName = config.offlineConversionName || "Conversão Offline";

  const rows = await listPaidRenewals({ from, to, onlyWithClickId: true });

  // Cabeçalho como PRIMEIRA linha. As colunas seguem o guia; o Google deixa
  // mapear na importação, então os nomes não precisam bater exatamente.
  const header = [
    "Google Click ID",
    "GBRAID",
    "WBRAID",
    "Conversion Name",
    "Conversion Time",
    "Conversion Value",
    "Conversion Currency",
    "Email",
    "Phone Number",
    "Order ID",
  ];
  const lines: string[] = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.gclid ?? ""),
        csvEscape(r.gbraid ?? ""),
        csvEscape(r.wbraid ?? ""),
        csvEscape(conversionName),
        csvEscape(fmtTimeBR(r.renewed_at)),
        csvEscape(Number.isFinite(Number(r.amount)) ? Number(r.amount).toFixed(2) : ""),
        csvEscape("BRL"),
        "", // Email (hash SHA-256) — não coletado neste funil.
        "", // Phone Number (hash SHA-256) — não coletado neste funil.
        csvEscape(String(r.transaction_id)), // Order ID (deduplicação do Google).
      ].join(",")
    );
  }

  // Sem vendas na janela: inclui UMA linha de exemplo para o Google Ads
  // conseguir detectar o esquema ao conectar. O gclid falso não casa com
  // nenhum clique, então não credita conversão. Some quando houver vendas.
  if (rows.length === 0) {
    lines.push(
      [
        csvEscape("EXEMPLO_SEM_VENDAS"),
        "",
        "",
        csvEscape(conversionName),
        csvEscape(fmtTimeBR(new Date().toISOString())),
        csvEscape("1.00"),
        csvEscape("BRL"),
        "",
        "",
        csvEscape("EXEMPLO-0001"),
      ].join(",")
    );
  }

  // CRLF é o mais compatível com o Google.
  const csv = lines.join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="conversoes-google-ads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
