// Injeta o gtag.js do Google Ads DIRETO no HTML (server-side), igual ao
// snippet padrao do Google. Assim o verificador do Google reconhece a tag
// (o next/script com afterInteractive so injetava depois, via JS, e nao era
// detectado). Renderiza nada se o ID nao estiver definido.
export default function GoogleAds({ adsId }: { adsId: string }) {
  if (!adsId) return null;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${adsId}');`,
        }}
      />
    </>
  );
}
