// Secao "Como baixar o app" com accordion recolhivel (um por aparelho).
// Usa <details>/<summary> nativos (sem JS). Passo a passo de buscar na loja
// pelo nome do app. Mostra a logo do app para o cliente reconhecer o icone.

type Device = { name: string; store: string; note?: string };

const DEVICES: Device[] = [
  { name: "Smart TV Samsung", store: "loja de apps da Samsung (Smart Hub / Apps)" },
  { name: "Smart TV LG", store: "LG Content Store" },
  { name: "Android TV / Google TV", store: "Google Play Store" },
  { name: "Fire TV Stick", store: "Amazon Appstore" },
  { name: "Roku", store: "loja de canais da Roku (Streaming Channels)" },
  { name: "TV Box", store: "Google Play Store (ou Aptoide)" },
  { name: "Celular ou Tablet Android", store: "Google Play Store" },
  { name: "iPhone / iPad", store: "App Store" },
];

export default function AppTutorial({
  appName,
  appLogoUrl,
}: {
  appName: string;
  appLogoUrl: string;
}) {
  return (
    <section className="tutorial">
      <h2 className="section-title">Como baixar o {appName}</h2>
      <p className="section-subtitle">
        É rápido: escolha seu aparelho e siga o passo a passo. Qualquer dúvida, chame no WhatsApp.
      </p>

      <div className="tutorial-wrap">
        <div className="tutorial-appbar">
          {appLogoUrl ? (
            <img src={appLogoUrl} alt={appName} className="tutorial-logo" loading="lazy" />
          ) : null}
          <div>
            <span className="tutorial-applabel">Procure por este app:</span>
            <strong className="tutorial-appname">{appName}</strong>
          </div>
        </div>

        <div className="tutorial-list">
          {DEVICES.map((d) => (
            <details key={d.name} className="tutorial-item">
              <summary className="tutorial-summary">
                <span>📺 {d.name}</span>
                <span className="tutorial-chevron" aria-hidden="true">
                  ⌄
                </span>
              </summary>
              <ol className="tutorial-steps">
                <li>Conecte sua {d.name} à internet.</li>
                <li>
                  Abra a <strong>{d.store}</strong>.
                </li>
                <li>
                  Busque por <strong>{appName}</strong> e clique em instalar.
                </li>
                <li>Abra o app e faça login com os dados que enviamos no seu WhatsApp.</li>
              </ol>
              {d.note ? <p className="tutorial-note">{d.note}</p> : null}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
