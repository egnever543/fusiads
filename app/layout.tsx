import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PREMIUM TV - Streaming Premium do Brasil",
  description:
    "PREMIUM TV - O melhor serviço de streaming do Brasil com mais de 85 mil conteúdos em HD, Full HD e 4K",
};

export const viewport: Viewport = {
  themeColor: "#ff0044",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
