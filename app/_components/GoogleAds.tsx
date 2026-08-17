import Script from "next/script";

// Injeta o gtag.js do Google Ads. Renderiza nada se o ID nao estiver definido.
export default function GoogleAds({ adsId }: { adsId: string }) {
  if (!adsId) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${adsId}');
        `}
      </Script>
    </>
  );
}
