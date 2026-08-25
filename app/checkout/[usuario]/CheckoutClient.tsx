"use client";

import { useEffect, useRef, useState } from "react";

type PkgView = { id: string; durationLabel: string; months: number; priceCents: number };

type Props = {
  username: string;
  expiresAt: string | null;
  status: string;
  packageName: string | null;
  telas: 1 | 2;
  adult: boolean;
  packages: PkgView[];
  pixEnabled: boolean;
  googleAdsId: string;
  conversionLabel: string;
};

type Pix = {
  id: number | string;
  amount: number;
  qrCode: string | null;
  qrCodeText: string | null;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function reais(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export default function CheckoutClient(props: Props) {
  const { username, expiresAt, status, packageName, telas, adult, packages, pixEnabled } = props;

  const [pix, setPix] = useState<Pix | null>(null);
  const [selected, setSelected] = useState<PkgView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const conversionFired = useRef(false);

  function gclidFromUrl(): string | null {
    try {
      return new URLSearchParams(window.location.search).get("gclid");
    } catch {
      return null;
    }
  }

  async function pagar(pkg: PkgView) {
    setError(null);
    setPaid(false);
    setSelected(pkg);
    setLoading(true);
    try {
      const r = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, packageId: pkg.id, gclid: gclidFromUrl() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error ?? "Erro ao gerar o PIX.");
        setLoading(false);
        return;
      }
      setPix({ id: d.id, amount: d.amount, qrCode: d.qrCode, qrCodeText: d.qrCodeText });
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  // Polling do status a cada 4s → ao confirmar, renova e dispara a conversão.
  useEffect(() => {
    if (!pix?.id || paid) return;
    let ativo = true;
    let processando = false;
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`/api/pix?id=${pix.id}`, { cache: "no-store" });
        const d = await r.json();
        if (!ativo || processando) return;
        if (d?.status === "paid" || d?.status === "approved") {
          processando = true;
          clearInterval(timer);
          await fetch("/api/renew", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId: pix.id }),
          }).catch(() => {});
          if (!ativo) return;
          setPaid(true);
          // Conversão Google Ads com o valor real (uma única vez).
          if (
            !conversionFired.current &&
            props.googleAdsId &&
            props.conversionLabel &&
            typeof window.gtag === "function"
          ) {
            conversionFired.current = true;
            window.gtag("event", "conversion", {
              send_to: `${props.googleAdsId}/${props.conversionLabel}`,
              value: pix.amount,
              currency: "BRL",
              transaction_id: String(pix.id),
            });
          }
        }
      } catch {
        /* ignora e tenta de novo */
      }
    }, 4000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [pix, paid, props.googleAdsId, props.conversionLabel]);

  function copiar() {
    if (!pix?.qrCodeText) return;
    navigator.clipboard?.writeText(pix.qrCodeText).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  }

  const planoLabel = `${telas} tela${telas > 1 ? "s" : ""}${adult ? " · +18" : ""}`;

  return (
    <main className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">Renovar assinatura</h1>
          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex justify-between py-1">
              <span>Usuário</span>
              <strong className="text-slate-800">{username}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span>Plano atual</span>
              <span className="text-slate-800">{packageName || planoLabel}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Vence em</span>
              <span className="text-slate-800">{fmtDate(expiresAt)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Status</span>
              <span className={status === "EXPIRED" ? "text-red-600" : "text-green-700"}>
                {status === "EXPIRED" ? "Expirado" : status === "ACTIVE" ? "Ativo" : status}
              </span>
            </div>
          </div>
        </div>

        {!pixEnabled ? (
          <div className="mt-6 rounded-2xl bg-amber-50 p-6 text-center text-amber-700">
            Pagamento indisponível no momento. Fale com o atendimento.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">Escolha a duração</h2>
            {packages.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum pacote disponível para este plano.</p>
            )}
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm"
              >
                <div>
                  <div className="font-semibold text-slate-800">{pkg.durationLabel}</div>
                  <div className="text-sm text-slate-500">
                    equivale a R$ {reais(Math.round(pkg.priceCents / pkg.months))}/mês
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">R$ {reais(pkg.priceCents)}</div>
                  <button
                    onClick={() => pagar(pkg)}
                    disabled={loading}
                    className="mt-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {loading && selected?.id === pkg.id ? "Gerando..." : "Pagar com PIX"}
                  </button>
                </div>
              </div>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>

      {/* Modal PIX */}
      {pix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            {!paid ? (
              <>
                <h3 className="text-lg font-bold text-slate-800">Pague com PIX</h3>
                <p className="mt-1 text-sm text-slate-500">Valor: R$ {reais(Math.round(pix.amount * 100))}</p>
                {pix.qrCode && (
                  <img src={pix.qrCode} alt="QR Code PIX" className="mx-auto my-4 h-56 w-56 object-contain" />
                )}
                {pix.qrCodeText && (
                  <>
                    <div className="break-all rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
                      {pix.qrCodeText}
                    </div>
                    <button
                      onClick={copiar}
                      className="mt-3 w-full rounded-lg bg-slate-800 px-4 py-2.5 font-semibold text-white hover:bg-slate-900"
                    >
                      {copied ? "Copiado! ✅" : "Copiar código PIX"}
                    </button>
                  </>
                )}
                <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-green-600" />
                  Aguardando confirmação…
                </p>
                <button onClick={() => setPix(null)} className="mt-3 text-sm text-slate-400 hover:text-slate-600">
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
                  ✅
                </div>
                <h3 className="text-lg font-bold text-slate-800">Pagamento confirmado!</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Sua assinatura foi renovada. Pode continuar usando o app normalmente com o mesmo login e senha.
                </p>
                <button
                  onClick={() => setPix(null)}
                  className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
