// ==========================================================================
// Camada comum de PIX. Abstrai o provedor (FastDePix, paggOne) atrás de uma
// interface única. Cada cliente escolhe o provedor no /admin. Roda só no servidor.
// ==========================================================================

import type { PixTransaction, CreateParams } from "./pix-types";
import * as fastdepix from "./fastdepix";
import * as paggone from "./paggone";
import * as ativopay from "./ativopay";

export type { PixTransaction, CreateParams, PixStatus } from "./pix-types";

export type PixProvider = "fastdepix" | "paggone" | "ativopay";

export const PIX_PROVIDERS: { value: PixProvider; label: string }[] = [
  { value: "fastdepix", label: "FastDePix" },
  { value: "paggone", label: "paggOne" },
  { value: "ativopay", label: "AtivoPay" },
];

export function normalizeProvider(v: unknown): PixProvider {
  if (v === "paggone") return "paggone";
  if (v === "ativopay") return "ativopay";
  return "fastdepix";
}

type Adapter = {
  pixConfigured: () => Promise<boolean>;
  createTransaction: (params: CreateParams) => Promise<PixTransaction>;
  getTransaction: (id: string | number) => Promise<PixTransaction>;
};

function adapter(provider: PixProvider): Adapter {
  if (provider === "paggone") return paggone;
  if (provider === "ativopay") return ativopay;
  return fastdepix;
}

export function pixConfigured(provider: PixProvider): Promise<boolean> {
  return adapter(provider).pixConfigured();
}

export function createTransaction(provider: PixProvider, params: CreateParams): Promise<PixTransaction> {
  return adapter(provider).createTransaction(params);
}

export function getTransaction(provider: PixProvider, id: string | number): Promise<PixTransaction> {
  return adapter(provider).getTransaction(id);
}
