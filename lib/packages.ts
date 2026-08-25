// ==========================================================================
// Catálogo de pacotes de renovação.
//
// ⚠️ VALORES FICTÍCIOS — trocar depois pelos preços e IDs reais do Sigma.
//   - priceCents: preço de VENDA (o que cobramos no PIX), em centavos.
//   - id:         o packageId do Sigma usado na renovação.
//
// A renovação detecta o plano atual do cliente (telas + adulto) e mostra só
// as durações compatíveis. Se o preço não variar por telas/adulto, basta
// repetir o mesmo valor nas linhas correspondentes.
// ==========================================================================

export type DurationKey = "mensal" | "trimestral" | "semestral" | "anual";

export type Package = {
  id: string; // packageId no Sigma (⚠️ trocar)
  duration: DurationKey;
  durationLabel: string;
  months: number;
  telas: 1 | 2;
  adult: boolean;
  priceCents: number; // ⚠️ trocar
};

export const packages: Package[] = [
  // ----- 1 TELA · SEM ADULTO -----
  { id: "SIGMA_PKG_1T_MENSAL", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 1, adult: false, priceCents: 2500 },
  { id: "SIGMA_PKG_1T_TRIMESTRAL", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 1, adult: false, priceCents: 6500 },
  { id: "SIGMA_PKG_1T_SEMESTRAL", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 1, adult: false, priceCents: 10000 },
  { id: "SIGMA_PKG_1T_ANUAL", duration: "anual", durationLabel: "Anual", months: 12, telas: 1, adult: false, priceCents: 15000 },

  // ----- 1 TELA · COM ADULTO -----
  { id: "SIGMA_PKG_1T_MENSAL_ADULT", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 1, adult: true, priceCents: 3000 },
  { id: "SIGMA_PKG_1T_TRIMESTRAL_ADULT", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 1, adult: true, priceCents: 7500 },
  { id: "SIGMA_PKG_1T_SEMESTRAL_ADULT", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 1, adult: true, priceCents: 11500 },
  { id: "SIGMA_PKG_1T_ANUAL_ADULT", duration: "anual", durationLabel: "Anual", months: 12, telas: 1, adult: true, priceCents: 17000 },

  // ----- 2 TELAS · SEM ADULTO -----
  { id: "SIGMA_PKG_2T_MENSAL", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 2, adult: false, priceCents: 3500 },
  { id: "SIGMA_PKG_2T_TRIMESTRAL", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 2, adult: false, priceCents: 9000 },
  { id: "SIGMA_PKG_2T_SEMESTRAL", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 2, adult: false, priceCents: 14000 },
  { id: "SIGMA_PKG_2T_ANUAL", duration: "anual", durationLabel: "Anual", months: 12, telas: 2, adult: false, priceCents: 21000 },

  // ----- 2 TELAS · COM ADULTO -----
  { id: "SIGMA_PKG_2T_MENSAL_ADULT", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 2, adult: true, priceCents: 4000 },
  { id: "SIGMA_PKG_2T_TRIMESTRAL_ADULT", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 2, adult: true, priceCents: 10000 },
  { id: "SIGMA_PKG_2T_SEMESTRAL_ADULT", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 2, adult: true, priceCents: 15500 },
  { id: "SIGMA_PKG_2T_ANUAL_ADULT", duration: "anual", durationLabel: "Anual", months: 12, telas: 2, adult: true, priceCents: 23000 },
];

export function getPackage(id: string): Package | undefined {
  return packages.find((p) => p.id === id);
}

// Lista os pacotes de uma combinação (telas + adulto), ordenados por duração.
export function listPackages(telas: 1 | 2, adult: boolean): Package[] {
  return packages
    .filter((p) => p.telas === telas && p.adult === adult)
    .sort((a, b) => a.months - b.months);
}

export function priceReais(cents: number): number {
  return cents / 100;
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
