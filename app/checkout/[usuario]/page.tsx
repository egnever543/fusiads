import { getConfig } from "@/lib/config";
import { findCustomerByUsername, sigmaConfigured } from "@/lib/sigma";
import { packages } from "@/lib/packages";
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
  const whatsapp = config.phones.find((p) => p.enabled && p.number)?.number ?? "";

  // ATENÇÃO: só dados NÃO sensíveis vão ao navegador (sem senha/id interno).
  return (
    <CheckoutClient
      username={customer.username}
      expiresAt={customer.expires_at}
      status={customer.status}
      packageName={customer.package}
      initialTelas={telas}
      initialAdult={customer.package_is_adult}
      packages={packages.map((p) => ({
        id: p.id,
        duration: p.duration,
        durationLabel: p.durationLabel,
        months: p.months,
        telas: p.telas,
        adult: p.adult,
        priceCents: p.priceCents,
      }))}
      pixEnabled={config.payments.pix}
      googleAdsId={config.googleAdsId}
      conversionLabel={config.conversionLabel}
      whatsapp={whatsapp}
    />
  );
}
