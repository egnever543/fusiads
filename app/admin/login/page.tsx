import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (isAuthenticated()) redirect("/admin");

  const hasPassword = Boolean(process.env.ADMIN_PASSWORD);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-800">Painel Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Fusiads</p>

        {!hasPassword && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Defina a variável de ambiente <code>ADMIN_PASSWORD</code> para poder entrar.
          </p>
        )}

        {searchParams.error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            Senha incorreta.
          </p>
        )}

        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Senha</label>
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white transition hover:bg-slate-900"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
