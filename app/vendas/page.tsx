import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { logoutAction } from "../admin/actions";
import VendasClient from "./VendasClient";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
  if (!isAuthenticated()) redirect("/admin/login");
  const config = await getConfig();

  return (
    <main className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Vendas</h1>
            <p className="text-sm text-slate-500">Registrar vendas e exportar conversões</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Admin
            </a>
            <form action={logoutAction}>
              <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                Sair
              </button>
            </form>
          </div>
        </div>

        <VendasClient
          conversionName={config.offlineConversionName}
          googleAdsId={config.googleAdsId}
        />
      </div>
    </main>
  );
}
