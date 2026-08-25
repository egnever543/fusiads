// ==========================================================================
// Catálogo de pacotes de renovação.
//
// ✅ PREÇOS e packageIds reais (padronizados para todos os clientes).
//   - id:         packageId do Sigma enviado na renovação.
//   - priceCents: preço de VENDA cobrado no PIX (em centavos).
//
// A renovação detecta o plano atual do cliente (telas + adulto) e mostra só
// as durações compatíveis.
// ==========================================================================

export type DurationKey = "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";

export type Package = {
  id: string; // packageId no Sigma
  duration: DurationKey;
  durationLabel: string;
  months: number;
  telas: 1 | 2;
  adult: boolean;
  priceCents: number;
};

export const packages: Package[] = [
  // ================= SEM ADULTO · 1 TELA =================
  { id: "z2BDvoWrkj", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 1, adult: false, priceCents: 2500 },
  { id: "EMeWepDnN9", duration: "bimestral", durationLabel: "Bimestral", months: 2, telas: 1, adult: false, priceCents: 4000 },
  { id: "qK4WrQDeNj", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 1, adult: false, priceCents: 6500 },
  { id: "7loL7aMWXM", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 1, adult: false, priceCents: 10000 },
  { id: "we6Wnw1K8N", duration: "anual", durationLabel: "Anual", months: 12, telas: 1, adult: false, priceCents: 15000 },

  // ================= SEM ADULTO · 2 TELAS =================
  { id: "kRXDgwDexV", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 2, adult: false, priceCents: 3500 },
  { id: "PkaL4dLgrz", duration: "bimestral", durationLabel: "Bimestral", months: 2, telas: 2, adult: false, priceCents: 5000 },
  { id: "nVrW8oDKaN", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 2, adult: false, priceCents: 7500 },
  { id: "BV4D3rrLaq", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 2, adult: false, priceCents: 12500 },
  { id: "rlKWOw3Wzo", duration: "anual", durationLabel: "Anual", months: 12, telas: 2, adult: false, priceCents: 19000 },

  // ================= COM ADULTO · 1 TELA =================
  { id: "o231qzL4qz", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 1, adult: true, priceCents: 3370 },
  { id: "VpKDaJWRAa", duration: "bimestral", durationLabel: "Bimestral", months: 2, telas: 1, adult: true, priceCents: 5400 },
  { id: "bOxLAQLZ7a", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 1, adult: true, priceCents: 8775 },
  { id: "JOALy014wx", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 1, adult: true, priceCents: 13500 },
  { id: "b8K1x6DvGN", duration: "anual", durationLabel: "Anual", months: 12, telas: 1, adult: true, priceCents: 20250 },

  // ================= COM ADULTO · 2 TELAS =================
  { id: "BKADdn1lrn", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 2, adult: true, priceCents: 4725 },
  { id: "ryJDzKWgeV", duration: "bimestral", durationLabel: "Bimestral", months: 2, telas: 2, adult: true, priceCents: 6750 },
  { id: "Yxl1jB1Mjm", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 2, adult: true, priceCents: 10125 },
  { id: "QywDmRWpRJ", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 2, adult: true, priceCents: 16875 },
  { id: "x2YD0v1QPa", duration: "anual", durationLabel: "Anual", months: 12, telas: 2, adult: true, priceCents: 25650 },
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
