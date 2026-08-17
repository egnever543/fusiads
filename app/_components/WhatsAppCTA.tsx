"use client";

import type { PhoneEntry } from "@/lib/config";

type Props = {
  phones: PhoneEntry[];
  message: string;
  googleAdsId: string;
  conversionLabel: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
};

// Escolhe um numero ponderado pelos pesos (divisao de trafego).
function pickPhone(phones: PhoneEntry[]): PhoneEntry | null {
  const active = phones.filter((p) => p.enabled && p.number);
  if (active.length === 0) return null;
  const total = active.reduce((sum, p) => sum + (p.weight > 0 ? p.weight : 1), 0);
  let r = Math.random() * total;
  for (const p of active) {
    r -= p.weight > 0 ? p.weight : 1;
    if (r <= 0) return p;
  }
  return active[active.length - 1];
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Botao que, no clique, escolhe um numero de WhatsApp por peso, dispara a
// conversao do Google Ads (se configurada) e abre a conversa.
export default function WhatsAppCTA({
  phones,
  message,
  googleAdsId,
  conversionLabel,
  className,
  title,
  children,
}: Props) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const phone = pickPhone(phones);

    const openWhatsApp = () => {
      if (!phone) {
        alert("Nenhum número de WhatsApp configurado. Configure em /admin.");
        return;
      }
      const url = `https://wa.me/${phone.number}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    };

    // Dispara conversao do Google Ads, se configurada.
    if (googleAdsId && conversionLabel && typeof window.gtag === "function") {
      let redirected = false;
      const go = () => {
        if (redirected) return;
        redirected = true;
        openWhatsApp();
      };
      window.gtag("event", "conversion", {
        send_to: `${googleAdsId}/${conversionLabel}`,
        event_callback: go,
      });
      // Fallback caso o callback demore.
      setTimeout(go, 800);
    } else {
      openWhatsApp();
    }
  };

  return (
    <a href="#" onClick={handleClick} className={className} title={title}>
      {children}
    </a>
  );
}
