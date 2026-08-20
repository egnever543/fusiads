"use client";

import { useState } from "react";
import { lookupLeadAction, registerSaleAction } from "./actions";
import type { Lead } from "@/lib/config";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500";

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[65%] break-all text-right font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function VendasClient({
  conversionName,
  googleAdsId,
}: {
  conversionName: string;
  googleAdsId: string;
}) {
  const [code, setCode] = useState("");
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario de venda
  const [value, setValue] = useState("");
  const [saleDate, setSaleDate] = useState(todayISODate());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Exportacao
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveMsg(null);
    setLead(null);
    setLoading(true);
    const res = await lookupLeadAction(code);
    setLoading(false);
    if (!res.ok || !res.lead) {
      setError(res.error ?? "Erro.");
      return;
    }
    setLead(res.lead);
    setValue(res.lead.sale_value != null ? String(res.lead.sale_value) : "");
    setSaleDate(res.lead.sold_at ? res.lead.sold_at.slice(0, 10) : todayISODate());
  }

  async function onRegister(sold: boolean) {
    if (!lead) return;
    setSaving(true);
    setSaveMsg(null);
    const soldAtISO = saleDate ? new Date(`${saleDate}T12:00:00`).toISOString() : new Date().toISOString();
    const res = await registerSaleAction({
      id: lead.id,
      sold,
      value: value ? Number(value.replace(",", ".")) : null,
      currency: "BRL",
      soldAt: soldAtISO,
    });
    setSaving(false);
    if (!res.ok) {
      setSaveMsg(res.error ?? "Erro ao salvar.");
      return;
    }
    if (res.lead) setLead(res.lead);
    setSaveMsg(sold ? "Venda registrada! ✅" : "Venda removida.");
  }

  const exportUrl = `/api/vendas/export${from || to ? `?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Buscar lead */}
      <Card title="Buscar por código" hint="Cole o código que chegou no seu WhatsApp (ex: PT-XXXXXXX).">
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PT-XXXXXXX"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-slate-800 px-5 py-2 font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {loading ? "..." : "Buscar"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      {/* Dados do lead */}
      {lead && (
        <>
          <Card title={`Lead ${lead.id}`}>
            <div>
              <Row label="gclid" value={lead.gclid} />
              <Row label="Dispositivo" value={lead.device} />
              <Row label="Caminho" value={Array.isArray(lead.path) ? lead.path.join(" › ") : null} />
              <Row label="utm_source" value={lead.utm_source} />
              <Row label="utm_campaign" value={lead.utm_campaign} />
              <Row label="utm_medium" value={lead.utm_medium} />
              <Row label="utm_content" value={lead.utm_content} />
              <Row label="utm_term" value={lead.utm_term} />
              <Row
                label="Data do lead"
                value={lead.created_at ? new Date(lead.created_at).toLocaleString("pt-BR") : null}
              />
              <Row
                label="Status"
                value={
                  lead.sold ? (
                    <span className="text-green-700">
                      Vendido{lead.sale_value != null ? ` • R$ ${lead.sale_value}` : ""}
                    </span>
                  ) : (
                    <span className="text-slate-500">Não vendido</span>
                  )
                }
              />
            </div>
            {!lead.gclid && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                Este lead não tem gclid — não entra no CSV de conversão do Google Ads.
              </p>
            )}
          </Card>

          {/* Registrar venda */}
          <Card title="Registrar venda">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  inputMode="decimal"
                  placeholder="150,00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Data da venda</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onRegister(true)}
                disabled={saving}
                className="rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : lead.sold ? "Atualizar venda" : "Marcar como vendido"}
              </button>
              {lead.sold && (
                <button
                  onClick={() => onRegister(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Desfazer
                </button>
              )}
              {saveMsg && <span className="text-sm text-slate-700">{saveMsg}</span>}
            </div>
          </Card>
        </>
      )}

      {/* Exportar CSV */}
      <Card
        title="Exportar conversões (Google Ads)"
        hint="Gera o CSV de conversões offline dos leads marcados como vendidos (que têm gclid), pronto para importar no Google Ads."
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">De (opcional)</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Até (opcional)</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </div>
        </div>

        {conversionName ? (
          <p className="text-sm text-slate-500">
            Nome da conversão que vai no CSV: <strong>{conversionName}</strong>{" "}
            {googleAdsId ? `(${googleAdsId})` : ""}
          </p>
        ) : (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Defina o <strong>Nome da conversão offline</strong> no /admin (precisa ser idêntico ao nome da
            ação de conversão criada no Google Ads).
          </p>
        )}

        <a
          href={exportUrl}
          className="inline-block rounded-lg bg-slate-800 px-6 py-2.5 font-semibold text-white hover:bg-slate-900"
        >
          Baixar CSV
        </a>
      </Card>
    </div>
  );
}
