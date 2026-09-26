import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDashboard, type SaleRow } from "@/lib/dashboard";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-sm text-slate-500">{sub}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  if (!isAuthenticated()) redirect("/admin/login");

  const d = await getDashboard();
  const maxDaily = Math.max(1, ...d.daily.map((x) => x.revenue));
  const totalGeral = d.renewals.all.revenue + d.manual.all.revenue;
  const conv = d.leads.total > 0 ? Math.round((d.leads.sold / d.leads.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500">Acompanhamento de vendas</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Configuração
            </a>
            <a
              href="/vendas"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Vendas
            </a>
            <form action={logoutAction}>
              <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                Sair
              </button>
            </form>
          </div>
        </div>

        {/* KPIs — Renovações (checkout) */}
        <h2 className="mb-2 text-sm font-semibold text-slate-600">Renovações (checkout PIX)</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi label="Hoje" value={brl(d.renewals.today.revenue)} sub={`${d.renewals.today.count} venda(s)`} />
          <Kpi label="7 dias" value={brl(d.renewals.last7.revenue)} sub={`${d.renewals.last7.count} venda(s)`} />
          <Kpi label="30 dias" value={brl(d.renewals.last30.revenue)} sub={`${d.renewals.last30.count} venda(s)`} />
          <Kpi label="Total" value={brl(d.renewals.all.revenue)} sub={`${d.renewals.all.count} venda(s)`} />
        </div>

        {/* Gráfico — receita diária (renovações), série única */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Receita por dia — últimos 14 dias</h3>
          <div className="mt-4 flex h-44 items-end gap-1.5" role="img" aria-label="Receita diária das renovações nos últimos 14 dias">
            {d.daily.map((day) => {
              const pct = Math.round((day.revenue / maxDaily) * 100);
              const [, mm, dd] = day.date.split("-");
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${dd}/${mm}: ${brl(day.revenue)} (${day.count})`}>
                  <div
                    className="w-full rounded-t bg-green-600"
                    style={{ height: `${Math.max(day.revenue > 0 ? 4 : 1, pct)}%` }}
                  />
                  <span className="text-[10px] tabular-nums text-slate-400">{dd}</span>
                </div>
              );
            })}
          </div>
          {d.renewals.all.count === 0 && (
            <p className="mt-3 text-sm text-slate-400">Ainda não há renovações registradas.</p>
          )}
        </section>

        {/* KPIs secundários — funil e vendas manuais */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi label="Receita total" value={brl(totalGeral)} sub="renovações + manuais" />
          <Kpi label="Leads (WhatsApp)" value={String(d.leads.total)} sub={`${d.leads.withGclid} com gclid`} />
          <Kpi label="Conversão" value={`${conv}%`} sub={`${d.leads.sold} de ${d.leads.total}`} />
          <Kpi label="Vendas manuais" value={brl(d.manual.all.revenue)} sub={`${d.manual.all.count} venda(s)`} />
        </div>

        {/* Tabela — vendas recentes */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Vendas recentes</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Data</th>
                  <th className="py-2 pr-3 font-semibold">Cliente / código</th>
                  <th className="py-2 pr-3 font-semibold">Plano / dispositivo</th>
                  <th className="py-2 pr-3 font-semibold">Origem</th>
                  <th className="py-2 pr-3 font-semibold">Clique</th>
                  <th className="py-2 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((r: SaleRow) => (
                  <tr key={`${r.source}-${r.id}`} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-600">{fmtDateTime(r.when)}</td>
                    <td className="py-2 pr-3 font-medium text-slate-800">{r.who}</td>
                    <td className="py-2 pr-3 text-slate-600">{r.label}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.source === "renovação" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.source}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{r.hasClickId ? "✅" : "—"}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-slate-800">
                      {r.amount != null ? brl(r.amount) : "—"}
                    </td>
                  </tr>
                ))}
                {d.recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Nenhuma venda ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
