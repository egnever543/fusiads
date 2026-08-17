import { getConfig } from "@/lib/config";
import GoogleAds from "./_components/GoogleAds";
import WhatsAppCTA from "./_components/WhatsAppCTA";

// Le sempre a configuracao mais recente do Supabase.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getConfig();

  return (
    <>
      {/* Injeta o Google Ads (gtag) com o ID definido no painel. */}
      <GoogleAds adsId={config.googleAdsId} />

      {/* ================================================================= */}
      {/* TEMPLATE PADRAO DO FRONT.                                          */}
      {/* Para usar o HTML do seu site: substitua o conteudo abaixo pelo    */}
      {/* seu HTML e troque os botoes de acao pelo componente <WhatsAppCTA />*/}
      {/* (ele cuida da divisao de trafego e da conversao do Google Ads).   */}
      {/* ================================================================= */}
      <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-20 text-center">
          <span className="rounded-full border border-white/20 px-4 py-1 text-sm text-white/70">
            {config.siteName}
          </span>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            {config.headline}
          </h1>
          <p className="max-w-xl text-lg text-white/70">{config.subheadline}</p>

          <WhatsAppCTA
            phones={config.phones}
            message={config.whatsappMessage}
            googleAdsId={config.googleAdsId}
            conversionLabel={config.conversionLabel}
            ctaText={config.ctaText}
          />

          <p className="text-sm text-white/40">
            Atendimento rápido • Resposta em minutos
          </p>
        </div>
      </main>
    </>
  );
}
