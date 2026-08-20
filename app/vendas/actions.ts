"use server";

import { isAuthenticated } from "@/lib/auth";
import { getLead, updateLeadSale, type Lead } from "@/lib/config";

// Busca um lead pelo codigo.
export async function lookupLeadAction(
  code: string
): Promise<{ ok: boolean; lead?: Lead; error?: string }> {
  if (!isAuthenticated()) return { ok: false, error: "Não autenticado." };
  const clean = String(code ?? "").trim();
  if (!clean) return { ok: false, error: "Digite um código." };
  const lead = await getLead(clean);
  if (!lead) return { ok: false, error: "Código não encontrado." };
  return { ok: true, lead };
}

// Registra (ou desfaz) a venda de um lead.
export async function registerSaleAction(input: {
  id: string;
  sold: boolean;
  value?: number | null;
  currency?: string;
  soldAt?: string;
}): Promise<{ ok: boolean; lead?: Lead; error?: string }> {
  if (!isAuthenticated()) return { ok: false, error: "Não autenticado." };
  const res = await updateLeadSale(input);
  if (!res.ok) return { ok: false, error: res.error };
  const lead = await getLead(input.id);
  return { ok: true, lead: lead ?? undefined };
}
