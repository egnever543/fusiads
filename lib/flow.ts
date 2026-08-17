// ==========================================================================
// Definicao do fluxo de chat (substitui o Typebot).
// Cada passo tem uma pergunta e opcoes. Uma opcao com "next" leva a outro
// passo; sem "next", ela finaliza o fluxo e envia para o WhatsApp.
// O "value" de cada opcao escolhida e concatenado para formar o rotulo do
// dispositivo enviado na mensagem (ex: "SMART TV - Samsung").
//
// Para editar o fluxo, basta mexer aqui.
// ==========================================================================

export type FlowOption = {
  label: string;
  emoji?: string;
  value: string;
  next?: string;
};

export type FlowStep = {
  id: string;
  question: string;
  options: FlowOption[];
};

export type Flow = {
  start: string;
  steps: Record<string, FlowStep>;
};

export const FLOW: Flow = {
  start: "device",
  steps: {
    device: {
      id: "device",
      question: "Qual seu dispositivo? 👋",
      options: [
        { label: "TV BOX", emoji: "📺", value: "TV BOX" },
        { label: "SMART TV", emoji: "📺", value: "SMART TV", next: "brand" },
        { label: "FIRE STICK / PROJETOR", emoji: "📺", value: "FIRE STICK / PROJETOR" },
        { label: "CELULAR / COMPUTADOR", emoji: "🕹️", value: "CELULAR / COMPUTADOR", next: "mobile" },
      ],
    },
    brand: {
      id: "brand",
      question: "Qual Marca da Sua TV? 🤔",
      options: [
        { label: "LG, Roku", value: "LG/Roku" },
        { label: "Samsung", value: "Samsung" },
        { label: "Android TV", value: "Android TV" },
        { label: "Outra", value: "Outra" },
      ],
    },
    mobile: {
      id: "mobile",
      question: "Qual desses aparelhos pretende usar o teste? 🤔",
      options: [
        { label: "CELULAR ANDROID", value: "Celular Android" },
        { label: "CELULAR IPHONE", value: "Celular iPhone" },
        { label: "COMPUTADOR", value: "Computador" },
      ],
    },
  },
};
