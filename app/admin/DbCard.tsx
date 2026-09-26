"use client";

import { useEffect, useState } from "react";

type StatusItem = { table: string; exists: boolean; missingColumns: string[] };
type Status =
  | { configured: false }
  | { configured: true; ok: boolean; items: StatusItem[]; error?: string };

export default function DbCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/migrate", { cache: "no-store" });
      const d = (await r.json()) as Status & { error?: string };
      if (!r.ok) {
        setErr((d as { error?: string })?.error ?? "Falha ao consultar o banco.");
        setStatus(null);
      } else {
        setStatus(d);
      }
    } catch {
      setErr("Falha de conexão ao consultar o banco.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function runMigration() {
    if (!confirm("Rodar a atualização do banco deste cliente agora?")) return;
    setRunning(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch("/api/admin/migrate", { method: "POST" });
      const d = await r.json();
      if (!r.ok || !d?.ok) {
        setErr(d?.error ?? "Falha ao atualizar o banco.");
      } else {
        setMsg("Banco atualizado com sucesso! ✅");
        if (d.status) setStatus(d.status as Status);
      }
    } catch {
      setErr("Falha de conexão ao atualizar o banco.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Banco de dados</h2>
      <p className="mt-1 text-sm text-slate-500">
        As tabelas são criadas/atualizadas <strong>automaticamente a cada deploy de produção</strong>. Este
        botão é uma alternativa manual (útil para forçar agora ou em caso de falha no deploy). Roda o schema
        versionado do projeto (seguro e idempotente).
      </p>

      <div className="mt-4">
        {loading && <p className="text-sm text-slate-500">Verificando…</p>}

        {!loading && status && status.configured === false && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Conexão com o Postgres não encontrada. Conecte o Supabase ao projeto no Vercel (ele cria a
            variável <strong>POSTGRES_URL_NON_POOLING</strong>) e faça um redeploy.
          </p>
        )}

        {!loading && status && status.configured === true && (
          <>
            {status.error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{status.error}</p>
            )}
            {!status.error && (
              <>
                <p className={`text-sm font-medium ${status.ok ? "text-green-700" : "text-amber-700"}`}>
                  {status.ok ? "Tudo atualizado ✅" : "Há itens faltando — clique em Atualizar banco."}
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {status.items.map((it) => (
                    <li key={it.table} className="flex items-center gap-2">
                      <span>{it.exists && it.missingColumns.length === 0 ? "✅" : it.exists ? "⚠️" : "❌"}</span>
                      <code className="text-slate-700">{it.table}</code>
                      {!it.exists && <span className="text-slate-400">(não existe)</span>}
                      {it.exists && it.missingColumns.length > 0 && (
                        <span className="text-amber-600">faltam: {it.missingColumns.join(", ")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={runMigration}
          disabled={running || (status?.configured === false)}
          className="rounded-lg bg-slate-800 px-6 py-2.5 font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
        >
          {running ? "Atualizando…" : "Atualizar banco"}
        </button>
        <button
          onClick={loadStatus}
          disabled={loading || running}
          className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-60"
        >
          Verificar novamente
        </button>
        {msg && <span className="text-sm text-green-700">{msg}</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </section>
  );
}
