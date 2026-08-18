import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getConfig } from "@/lib/config";
import GoogleAds from "./_components/GoogleAds";

export const metadata: Metadata = {
  title: "PREMIUM TV - Streaming Premium do Brasil",
  description:
    "PREMIUM TV - O melhor serviço de streaming do Brasil com mais de 85 mil conteúdos em HD, Full HD e 4K",
};

export const viewport: Viewport = {
  themeColor: "#ff0044",
};

// Sempre renderiza no servidor com a config mais recente (para a tag do Google).
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getConfig();
  return (
    <html lang="pt-BR">
      <head>
        {/* Tag do Google Ads direto no <head>, igual ao snippet padrao. */}
        <GoogleAds adsId={config.googleAdsId} />
      </head>
      <body>{children}</body>
    </html>
  );
}
