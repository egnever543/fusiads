import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getSecretsStatus } from "@/lib/secrets";
import { checkSchemaViaServiceRole, getSchemaSql } from "@/lib/db-admin";
import { versionLabel } from "@/lib/version";
import { logoutAction } from "./actions";
import AdminForm from "./AdminForm";
import DbStatusPanel from "./DbStatusPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAuthenticated()) redirect("/admin/login");

  const config = await getConfig();
  const secrets = await getSecretsStatus();
  // Checa o banco a cada acesso ao painel (via service_role). Se algo faltar,
  // mostramos o SQL pronto para copiar.
  const dbStatus = await checkSchemaViaServiceRole();
  const schemaSql =
    dbStatus.configured === true && dbStatus.ok ? "" : await getSchemaSql();

  return (
    <main className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel Admin</h1>
            <p className="text-sm text-slate-500">Configuração do site</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Dashboard
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

        <AdminForm initial={config} secrets={secrets} />

        <div className="mt-6">
          <DbStatusPanel status={dbStatus} schemaSql={schemaSql} />
        </div>
      </div>

      {/* Versão do sistema — ajuda a conferir se cada conta subiu o deploy. */}
      <footer className="mt-10 pb-4 text-center text-xs text-slate-400">
        {versionLabel()}
      </footer>
    </main>
  );
}
