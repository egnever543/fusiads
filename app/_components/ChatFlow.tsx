"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhoneEntry } from "@/lib/config";
import { FLOW, type FlowOption } from "@/lib/flow";
import { OPEN_FLOW_EVENT } from "./FlowTrigger";
import "./chatflow.css";

type Props = {
  phones: PhoneEntry[];
  introMessage: string;
  googleAdsId: string;
  conversionLabel: string;
};

type ChatMessage = { from: "bot" | "user"; text: string };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

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

// Gera um ID curto e legivel. Ex: PT-LZ4K9A2XQ
function genLeadId(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `PT-${t}${r}`;
}

// Le os parametros de rastreamento da URL atual.
function readTracking() {
  const params = new URLSearchParams(window.location.search);
  const get = (k: string) => params.get(k) ?? undefined;
  return {
    gclid: get("gclid"),
    fbclid: get("fbclid"),
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_content: get("utm_content"),
    utm_term: get("utm_term"),
    referrer: document.referrer || undefined,
    user_agent: navigator.userAgent,
  };
}

export default function ChatFlow({ phones, introMessage, googleAdsId, conversionLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [options, setOptions] = useState<FlowOption[] | null>(null);
  const [finished, setFinished] = useState(false);
  const pathRef = useRef<string[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToStep = useCallback((stepId: string) => {
    const step = FLOW.steps[stepId];
    if (!step) return;
    setOptions(null);
    setMessages((m) => [...m, { from: "bot", text: step.question }]);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    // Pequeno atraso para simular a "digitacao" antes de mostrar as opcoes.
    typingTimer.current = setTimeout(() => setOptions(step.options), 450);
  }, []);

  const start = useCallback(() => {
    pathRef.current = [];
    setFinished(false);
    setMessages([]);
    setOptions(null);
    setOpen(true);
    // Primeira pergunta.
    setTimeout(() => goToStep(FLOW.start), 300);
  }, [goToStep]);

  const close = useCallback(() => {
    setOpen(false);
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

  // Envia para o WhatsApp. Chamado de forma SINCRONA no clique (evita bloqueio
  // de pop-up) quando a opcao finaliza o fluxo.
  const finish = useCallback(
    (path: string[]) => {
      const deviceLabel = path.join(" - ");
      const id = genLeadId();
      const phone = pickPhone(phones);

      if (!phone) {
        setMessages((m) => [
          ...m,
          { from: "bot", text: "Nenhum número configurado ainda. Configure em /admin. ⚙️" },
        ]);
        return;
      }

      const message = `${introMessage}\n${deviceLabel}\nCód: ${id}`;
      const url = `https://wa.me/${phone.number}?text=${encodeURIComponent(message)}`;
      // Abre o WhatsApp imediatamente (dentro do gesto do usuario).
      window.open(url, "_blank");

      // Dispara a conversao do Google Ads (se configurada).
      if (googleAdsId && conversionLabel && typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: `${googleAdsId}/${conversionLabel}`,
        });
      }

      // Grava o lead no Supabase (fire-and-forget, nao bloqueia a UI).
      try {
        const tracking = readTracking();
        fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, device: deviceLabel, path, ...tracking }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* ignore */
      }

      setOptions(null);
      setFinished(true);
      setMessages((m) => [
        ...m,
        { from: "bot", text: "Perfeito! Abrindo o WhatsApp para finalizar seu teste... ✅" },
      ]);
    },
    [phones, introMessage, googleAdsId, conversionLabel]
  );

  const select = useCallback(
    (option: FlowOption) => {
      // Registra a escolha do usuario.
      setMessages((m) => [
        ...m,
        { from: "user", text: `${option.emoji ? option.emoji + " " : ""}${option.label}` },
      ]);
      setOptions(null);
      const newPath = [...pathRef.current, option.value];
      pathRef.current = newPath;

      if (option.next) {
        goToStep(option.next);
      } else {
        finish(newPath);
      }
    },
    [goToStep, finish]
  );

  // Abre o fluxo quando qualquer botao dispara o evento.
  useEffect(() => {
    const handler = () => start();
    window.addEventListener(OPEN_FLOW_EVENT, handler);
    return () => window.removeEventListener(OPEN_FLOW_EVENT, handler);
  }, [start]);

  // Fecha com ESC.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Bloqueia o scroll do body enquanto o modal esta aberto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Rola para o final a cada nova mensagem/opcao.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, options]);

  if (!open) return null;

  return (
    <div className="chatflow" role="dialog" aria-modal="true">
      <button className="chatflow-close" onClick={close} aria-label="Fechar">
        ✕
      </button>
      <div className="chatflow-body" ref={bodyRef}>
        {messages.map((m, i) =>
          m.from === "bot" ? (
            <div className="cf-row cf-bot" key={i}>
              <div className="cf-avatar" aria-hidden="true">
                🎧
              </div>
              <div className="cf-bubble cf-bubble-bot">{m.text}</div>
            </div>
          ) : (
            <div className="cf-row cf-user" key={i}>
              <div className="cf-bubble cf-bubble-user">{m.text}</div>
            </div>
          )
        )}

        {options && (
          <div className="cf-options">
            {options.map((o) => (
              <button className="cf-option" key={o.value} onClick={() => select(o)}>
                {o.emoji ? `${o.emoji} ` : ""}
                {o.label}
              </button>
            ))}
          </div>
        )}

        {finished && <div className="cf-spinner" aria-hidden="true" />}
      </div>
    </div>
  );
}
