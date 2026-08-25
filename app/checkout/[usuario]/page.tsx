import { getConfig } from "@/lib/config";
import { findCustomerByUsername, sigmaConfigured } from "@/lib/sigma";
import { listPackages } from "@/lib/packages";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        <p className="mt-2 text-slate-600">{text}</p>
      </div>
    </main>
  );
}

export default async function CheckoutPage({ params }: { params: { usuario: string } }) {
  const usuario = decodeURIComponent(params.usuario);
  const config = await getConfig();

  if (!sigmaConfigured()) {
    return <Message title="Indisponível" text="Pagamento não configurado. Fale com o atendimento." />;
  }

  const customer = await findCustomerByUsername(usuario);
  if (!customer) {
    return (
      <Message
        title="Usuário não encontrado"
        text={`Não encontramos "${usuario}". Confira o link com o atendimento.`}
      />
    );
  }

  const telas = (customer.connections === 2 ? 2 : 1) as 1 | 2;
  const pkgs = listPackages(telas, customer.package_is_adult);

  // ATENÇÃO: só enviamos dados NÃO sensíveis ao navegador (sem senha, sem o id
  // interno do cliente). A rota /api/pix resolve o cliente pelo username no
  // servidor para renovar.
  return (
    <CheckoutClient
      username={customer.username}
      expiresAt={customer.expires_at}
      status={customer.status}
      packageName={customer.package}
      telas={telas}
      adult={customer.package_is_adult}
      packages={pkgs.map((p) => ({
        id: p.id,
        durationLabel: p.durationLabel,
        months: p.months,
        priceCents: p.priceCents,
      }))}
      pixEnabled={config.pixEnabled}
      googleAdsId={config.googleAdsId}
      conversionLabel={config.conversionLabel}
    />
  );
}
