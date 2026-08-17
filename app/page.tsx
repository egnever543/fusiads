import { getConfig } from "@/lib/config";
import GoogleAds from "./_components/GoogleAds";
import WhatsAppCTA from "./_components/WhatsAppCTA";
import "./_components/landing.css";

// Le sempre a configuracao mais recente do Supabase.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getConfig();

  // Props comuns para todos os botoes de acao (divisao de trafego + conversao).
  const cta = {
    phones: config.phones,
    message: config.whatsappMessage,
    googleAdsId: config.googleAdsId,
    conversionLabel: config.conversionLabel,
  };

  return (
    <>
      {/* Google Ads (gtag) com o ID definido no painel /admin. */}
      <GoogleAds adsId={config.googleAdsId} />

      <div className="premium-landing">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <span className="hero-badge">⚡ A Melhor do Brasil</span>
            <h1>ASSISTA SEUS PROGRAMAS FAVORITOS SEM TRAVAMENTO</h1>
            <p className="hero-subtitle">
              A MELHOR DO BRASIL + DE 85 MIL CONTEÚDO! CANAIS, FILMES E SÉRIES EM HD, FULL HD E 4K
            </p>
            <WhatsAppCTA {...cta} className="cta-button">
              TESTAR AGORA
            </WhatsAppCTA>
          </div>
          <div className="hero-image">
            <img
              src="https://cinebrasil.top/wp-content/uploads/2025/10/IPTV-MODELO02-B02-1024x1024-1.webp"
              alt="PREMIUM TV"
              loading="lazy"
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="features">
          <h2 className="section-title">Por que escolher a PREMIUM TV?</h2>
          <p className="section-subtitle">A melhor experiência em streaming do Brasil</p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3 className="feature-title">+100 MIL CONTEÚDOS</h3>
              <p className="feature-description">
                Em nosso Aplicativo você pode assistir todos os filmes que deseja
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📺</div>
              <h3 className="feature-title">TODOS OS TIPOS DE SÉRIES</h3>
              <p className="feature-description">
                Nosso App oferece todos os tipos de Séries, basta escolher qual quer assistir
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📡</div>
              <h3 className="feature-title">CANAIS ABERTOS E FECHADOS</h3>
              <p className="feature-description">
                Oferecemos todos os Canais Abertos e Fechados, sem travamentos
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "60px" }}>
            <WhatsAppCTA {...cta} className="cta-button">
              TESTAR AGORA
            </WhatsAppCTA>
          </div>
        </section>

        {/* Content Section */}
        <section className="content-section">
          <div className="content-grid">
            <div className="content-image">
              <img
                src="https://cinebrasil.top/wp-content/uploads/2025/10/IPTV-MODELO-B02-1-1024x1024-1.webp"
                alt="Assista onde quiser"
                loading="lazy"
              />
            </div>
            <div className="content-text">
              <h2>Assista onde quiser</h2>
              <p>
                A <strong><em>PREMIUM TV</em></strong> oferece um aplicativo totalmente exclusivo
                para você. Basta baixa-lo e assistir tudo o que quiser e quando quiser.
              </p>
              <div className="stats">
                <div className="stat">
                  <span className="stat-number">+85K</span>
                  <span className="stat-label">Conteúdos</span>
                </div>
                <div className="stat">
                  <span className="stat-number">4K</span>
                  <span className="stat-label">Qualidade</span>
                </div>
                <div className="stat">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Suporte</span>
                </div>
              </div>

              <div style={{ marginTop: "40px" }}>
                <WhatsAppCTA {...cta} className="cta-button">
                  TESTAR AGORA
                </WhatsAppCTA>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="pricing">
          <h2 className="section-title">Escolha Seu Plano</h2>
          <p className="section-subtitle">Teste grátis antes de pagar!</p>

          <div className="pricing-grid">
            {[
              { title: "Plano Mensal", price: "R$25,00" },
              { title: "Plano Semestral", price: "R$100,00" },
              { title: "Plano Anual", price: "R$150,00" },
            ].map((plan) => (
              <div className="pricing-card" key={plan.title}>
                <div className="pricing-header">
                  <h3 className="pricing-title">{plan.title}</h3>
                  <div className="pricing-price">{plan.price}</div>
                </div>
                <ul className="pricing-features">
                  <li>Teste Grátis Antes de Pagar</li>
                  <li>1 Tela</li>
                  <li>Qualidade FHD/HD/SD</li>
                  <li>Canais / Filmes / Séries</li>
                  <li>+70 Mil Conteúdos</li>
                  <li>Atualiza 1x no Mês</li>
                </ul>
                <WhatsAppCTA {...cta} className="pricing-button">
                  TESTAR AGORA
                </WhatsAppCTA>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <h2>A MELHOR QUALIDADE DO MERCADO</h2>
          <p>
            Não perca tempo! Comece agora a assistir seus programas favoritos em altíssima
            qualidade.
          </p>
          <WhatsAppCTA {...cta} className="cta-button">
            TESTAR AGORA
          </WhatsAppCTA>
        </section>

        {/* Footer */}
        <footer>
          <p>&copy; 2025 PREMIUM TV. Todos os direitos reservados.</p>
        </footer>

        {/* Botão Flutuante */}
        <WhatsAppCTA {...cta} className="floating-button" title="Falar no WhatsApp">
          💬
        </WhatsAppCTA>
      </div>
    </>
  );
}
