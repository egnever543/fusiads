// ==========================================================================
// Catálogo de pacotes de renovação.
//
// ✅ PREÇOS reais (padronizados para todos os clientes).
// ⚠️ id (packageId do Sigma) ainda é PLACEHOLDER — trocar pelos IDs reais.
//
// A renovação detecta o plano atual do cliente (telas + adulto) e mostra só
// as durações compatíveis.
// ==========================================================================

export type DurationKey = "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";

export type Package = {
  id: string; // packageId no Sigma (⚠️ trocar pelos IDs reais)
  duration: DurationKey;
  durationLabel: string;
  months: number;
  telas: 1 | 2;
  adult: boolean;
  priceCents: number;
};

export const packages: Package[] = [
  // ================= SEM ADULTO · 1 TELA =================
  { id: "SIGMA_PKG_1T_MENSAL", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 1, adult: false, priceCents: 2500 },
  { id: "SIGMA_PKG_1T_BIMESTRAL", duration: "bimestral", durationLabel: "Bimestral", months: 2, telas: 1, adult: false, priceCents: 4000 },
  { id: "SIGMA_PKG_1T_TRIMESTRAL", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 1, adult: false, priceCents: 6500 },
  { id: "SIGMA_PKG_1T_SEMESTRAL", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 1, adult: false, priceCents: 10000 },
  { id: "SIGMA_PKG_1T_ANUAL", duration: "anual", durationLabel: "Anual", months: 12, telas: 1, adult: false, priceCents: 15000 },

  // ================= SEM ADULTO · 2 TELAS =================
  { id: "SIGMA_PKG_2T_MENSAL", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 2, adult: false, priceCents: 3500 },
  { id: "SIGMA_PKG_2T_BIMESTRAL", duration: "bimestral", durationLabel: "Bimestral", months: 2, telas: 2, adult: false, priceCents: 5000 },
  { id: "SIGMA_PKG_2T_TRIMESTRAL", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 2, adult: false, priceCents: 7500 },
  { id: "SIGMA_PKG_2T_SEMESTRAL", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 2, adult: false, priceCents: 12500 },
  { id: "SIGMA_PKG_2T_ANUAL", duration: "anual", durationLabel: "Anual", months: 12, telas: 2, adult: false, priceCents: 19000 },

  // ================= COM ADULTO · 1 TELA =================
  { id: "SIGMA_PKG_1T_MENSAL_ADULT", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 1, adult: true, priceCents: 3370 },
  { id: "SIGMA_PKG_1T_BIMESTRAL_ADULT", duration: "bimestral", durationLabel: "Bimestral", months: 2, telas: 1, adult: true, priceCents: 5400 },
  { id: "SIGMA_PKG_1T_TRIMESTRAL_ADULT", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 1, adult: true, priceCents: 8775 },
  { id: "SIGMA_PKG_1T_SEMESTRAL_ADULT", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 1, adult: true, priceCents: 13500 },
  { id: "SIGMA_PKG_1T_ANUAL_ADULT", duration: "anual", durationLabel: "Anual", months: 12, telas: 1, adult: true, priceCents: 20250 },

  // ================= COM ADULTO · 2 TELAS =================
  { id: "SIGMA_PKG_2T_MENSAL_ADULT", duration: "mensal", durationLabel: "Mensal", months: 1, telas: 2, adult: true, priceCents: 4725 },
  { id: "SIGMA_PKG_2T_BIMESTRAL_ADULT", duration: "bimestral", durationLabel: "Bimestral", months: 2, telas: 2, adult: true, priceCents: 6750 },
  { id: "SIGMA_PKG_2T_TRIMESTRAL_ADULT", duration: "trimestral", durationLabel: "Trimestral", months: 3, telas: 2, adult: true, priceCents: 10125 },
  { id: "SIGMA_PKG_2T_SEMESTRAL_ADULT", duration: "semestral", durationLabel: "Semestral", months: 6, telas: 2, adult: true, priceCents: 16875 },
  { id: "SIGMA_PKG_2T_ANUAL_ADULT", duration: "anual", durationLabel: "Anual", months: 12, telas: 2, adult: true, priceCents: 25650 },
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
