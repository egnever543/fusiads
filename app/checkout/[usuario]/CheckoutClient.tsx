"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PkgView = {
  id: string;
  duration: string;
  durationLabel: string;
  months: number;
  telas: 1 | 2;
  adult: boolean;
  priceCents: number;
};

type Props = {
  username: string;
  expiresAt: string | null;
  status: string;
  packageName: string | null;
  initialTelas: 1 | 2;
  initialAdult: boolean;
  packages: PkgView[];
  pixEnabled: boolean;
  googleAdsId: string;
  conversionLabel: string;
  whatsapp: string;
};

type Pix = { id: number | string; amount: number; qrCode: string | null; qrCodeText: string | null };

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
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default function CheckoutClient(props: Props) {
  const { username, expiresAt, status, packageName, packages, pixEnabled, whatsapp } = props;

  const [telas, setTelas] = useState<1 | 2>(props.initialTelas);
  const [adult, setAdult] = useState<boolean>(props.initialAdult);
  const [pix, setPix] = useState<Pix | null>(null);
  const [selected, setSelected] = useState<PkgView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const conversionFired = useRef(false);

  const lista = useMemo(
    () => packages.filter((p) => p.telas === telas && p.adult === adult).sort((a, b) => a.months - b.months),
    [packages, telas, adult]
  );
  const mensalMonthly = useMemo(() => {
    const m = lista.find((p) => p.duration === "mensal");
    return m ? m.priceCents / m.months : null;
  }, [lista]);

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
        return;
      }
      setPix({ id: d.id, amount: d.amount, qrCode: d.qrCode, qrCodeText: d.qrCodeText });
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

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
        /* tenta de novo */
      }
    }, 4000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [pix, paid, props.googleAdsId, props.conversionLabel]);

  function copiar() {
    if (!pix?.qrCodeText) return;
    navigator.clipboard?.writeText(pix.qrCodeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Quero renovar meu plano.\nUsuário: ${username}`)}`
    : null;

  const pill = (activeCond: boolean) =>
    `rounded-full px-5 py-2 text-sm font-semibold transition ${
      activeCond ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        {/* Cabeçalho do cliente */}
        <div className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
            <span className="text-slate-500">
              Usuário: <strong className="text-slate-800">{username}</strong>
            </span>
            <span className="text-slate-500">
              Vence em: <strong className="text-slate-800">{fmtDate(expiresAt)}</strong>
            </span>
            <span className={status === "EXPIRED" ? "font-semibold text-red-600" : "font-semibold text-green-700"}>
              {status === "EXPIRED" ? "Expirado" : status === "ACTIVE" ? "Ativo" : status}
            </span>
          </div>
        </div>

        {/* Título */}
        <div className="mt-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">Escolha sua licença</h1>
          <p className="mt-2 text-slate-500">
            Renovação na hora — seu acesso continua com o mesmo login e senha.
          </p>
        </div>

        {/* Seletores */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
          <div className="text-center">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Quantas telas?</div>
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
              <button className={pill(telas === 1)} onClick={() => setTelas(1)}>1 tela</button>
              <button className={pill(telas === 2)} onClick={() => setTelas(2)}>2 telas</button>
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Conteúdo adulto?</div>
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
              <button className={pill(!adult)} onClick={() => setAdult(false)}>Sem adulto</button>
              <button className={pill(adult)} onClick={() => setAdult(true)}>Com adulto</button>
            </div>
          </div>
        </div>

        {/* Cards de planos */}
        {!pixEnabled ? (
          <div className="mx-auto mt-8 max-w-md rounded-2xl bg-amber-50 p-6 text-center text-amber-700">
            Pagamento indisponível no momento. Fale com o atendimento.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((pkg) => {
              const monthly = pkg.priceCents / pkg.months;
              const economia = mensalMonthly ? Math.round((1 - monthly / mensalMonthly) * 100) : 0;
              const destaque = pkg.duration === "anual";
              return (
                <div
                  key={pkg.id}
                  className={`flex flex-col rounded-2xl bg-white p-6 shadow-sm ${
                    destaque ? "ring-2 ring-blue-600" : "border border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-bold text-slate-900">{pkg.durationLabel}</h3>
                    {economia > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Economize {economia}%
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="align-top text-sm text-slate-500">R$ </span>
                    <span className="text-4xl font-extrabold text-slate-900">{reais(pkg.priceCents)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    equivale a R$ {reais(Math.round(monthly))}/mês
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    <li>✓ {pkg.telas} tela{pkg.telas > 1 ? "s" : ""} simultânea{pkg.telas > 1 ? "s" : ""}</li>
                    <li>✓ {pkg.adult ? "Com" : "Sem"} conteúdo adulto</li>
                    <li>✓ Ativação imediata</li>
                    <li>✓ Suporte no WhatsApp</li>
                  </ul>
                  <button
                    onClick={() => pagar(pkg)}
                    disabled={loading}
                    className={`mt-6 w-full rounded-full px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                      destaque
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {loading && selected?.id === pkg.id ? "Gerando..." : `Assinar ${pkg.durationLabel}`}
                  </button>
                </div>
              );
            })}
            {lista.length === 0 && (
              <p className="col-span-full text-center text-sm text-slate-500">
                Nenhum pacote disponível para esta combinação.
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

        {/* Comprar pelo WhatsApp */}
        {waLink && (
          <div className="mt-8 text-center">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-green-500 px-8 py-3 font-semibold text-white shadow hover:bg-green-600"
            >
              💬 Comprar pelo WhatsApp
            </a>
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
