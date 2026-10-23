"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StatusItem = { table: string; exists: boolean; missingColumns: string[] };
type Status =
  | { configured: false }
  | { configured: true; ok: boolean; items: StatusItem[]; error?: string };

export default function DbStatusPanel({
  status,
  schemaSql,
}: {
  status: Status;
  schemaSql: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function copiar() {
    navigator.clipboard?.writeText(schemaSql).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => setErr("Não foi possível copiar — selecione e copie manualmente.")
    );
  }

  function verificar() {
    setChecking(true);
    setMsg(null);
    setErr(null);
    router.refresh();
    // o refresh re-renderiza via servidor; soltamos o estado logo depois.
    setTimeout(() => setChecking(false), 1200);
  }

  async function atualizar() {
    if (!confirm("Rodar a atualização automática do banco agora?")) return;
    setRunning(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch("/api/admin/migrate", { method: "POST" });
      const d = await r.json();
      if (!r.ok || !d?.ok) {
        setErr(d?.error ?? "Falha ao atualizar. Use o SQL abaixo no Supabase.");
      } else {
        setMsg("Banco atualizado! ✅");
        router.refresh();
      }
    } catch {
      setErr("Falha de conexão. Use o SQL abaixo no Supabase.");
    } finally {
      setRunning(false);
    }
  }

  const ok = status.configured === true && status.ok;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Banco de dados</h2>
      <p className="mt-1 text-sm text-slate-500">
        Checado automaticamente a cada acesso. Se faltar algo, copie o SQL abaixo e rode no{" "}
        <strong>SQL Editor</strong> do Supabase deste cliente.
      </p>

      <div className="mt-4">
        {status.configured === false && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Supabase não configurado neste projeto (faltam as variáveis NEXT_PUBLIC_SUPABASE_URL /
            SUPABASE_SERVICE_ROLE_KEY).
          </p>
        )}

        {status.configured === true && status.error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{status.error}</p>
        )}

        {status.configured === true && !status.error && (
          <>
            <p className={`text-sm font-medium ${status.ok ? "text-green-700" : "text-amber-700"}`}>
              {status.ok ? "Tudo atualizado ✅" : "⚠️ Há itens faltando — rode o SQL abaixo."}
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {status.items.map((it) => (
                <li key={it.table} className="flex items-center gap-2">
                  <span>
                    {it.exists && it.missingColumns.length === 0 ? "✅" : it.exists ? "⚠️" : "❌"}
                  </span>
                  <code className="text-slate-700">{it.table}</code>
                  {!it.exists && <span className="text-slate-400">(não existe)</span>}
                  {it.exists && it.missingColumns.length > 0 && (
                    <span className="text-amber-600">faltam colunas: {it.missingColumns.join(", ")}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* SQL pronto para copiar (só quando há algo faltando) */}
      {!ok && schemaSql && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-3">
            <button
              onClick={copiar}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
            >
              {copied ? "Copiado! ✅" : "Copiar SQL"}
            </button>
            <span className="text-xs text-slate-500">
              Cole no Supabase → SQL Editor → Run. É seguro rodar (idempotente).
            </span>
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
            <code>{schemaSql}</code>
          </pre>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          onClick={verificar}
          disabled={checking}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {checking ? "Verificando…" : "Verificar novamente"}
        </button>
        <button
          onClick={atualizar}
          disabled={running}
          className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-60"
        >
          {running ? "Atualizando…" : "Atualizar automaticamente (se o Postgres estiver conectado)"}
        </button>
        {msg && <span className="text-sm text-green-700">{msg}</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </section>
  );
}
