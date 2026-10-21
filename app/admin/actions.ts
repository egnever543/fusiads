"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  verifyPassword,
  sessionCookieName,
  sessionCookieValue,
  isAuthenticated,
} from "@/lib/auth";
import { saveConfig, normalizeConfig, type SiteConfig, type PhoneEntry } from "@/lib/config";
import { saveSecrets } from "@/lib/secrets";

// --- Login ---
export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    redirect("/admin/login?error=1");
  }
  const value = sessionCookieValue();
  if (value) {
    cookies().set(sessionCookieName(), value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });
  }
  redirect("/admin");
}

// --- Logout ---
export async function logoutAction() {
  cookies().delete(sessionCookieName());
  redirect("/admin/login");
}

// --- Salvar configuracao ---
export type SaveState = { ok?: boolean; error?: string; savedAt?: number };

export async function saveConfigAction(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  if (!isAuthenticated()) {
    return { ok: false, error: "Não autenticado." };
  }

  const phones: PhoneEntry[] = [];
  for (let i = 0; i < 4; i++) {
    phones.push({
      number: String(formData.get(`phone_${i}_number`) ?? ""),
      percent: Number(formData.get(`phone_${i}_percent`) ?? 0),
      enabled: formData.get(`phone_${i}_enabled`) === "on",
      label: String(formData.get(`phone_${i}_label`) ?? `Número ${i + 1}`),
    });
  }

  const config: SiteConfig = normalizeConfig({
    phones,
    whatsappMessage: String(formData.get("whatsappMessage") ?? ""),
    googleAdsId: String(formData.get("googleAdsId") ?? "").trim(),
    conversionLabel: String(formData.get("conversionLabel") ?? "").trim(),
    offlineConversionName: String(formData.get("offlineConversionName") ?? "").trim(),
    payments: {
      pix: formData.get("payment_pix") === "on",
      pixProvider:
        formData.get("payment_provider") === "paggone"
          ? "paggone"
          : formData.get("payment_provider") === "ativopay"
            ? "ativopay"
            : "fastdepix",
    },
  });

  const result = await saveConfig(config);
  if (!result.ok) return { ok: false, error: result.error };

  // Tokens dos provedores: guardados na tabela protegida `secrets` (nunca em
  // site_config). Só sobrescreve os campos que vieram preenchidos.
  const fastdepixToken = String(formData.get("fastdepix_token") ?? "").trim();
  const paggoneToken = String(formData.get("paggone_token") ?? "").trim();
  const ativopayToken = String(formData.get("ativopay_token") ?? "").trim();
  const patch: Record<string, string> = {};
  if (fastdepixToken) patch.fastdepix_api_key = fastdepixToken;
  if (paggoneToken) patch.paggone_api_key = paggoneToken;
  if (ativopayToken) patch.ativopay_api_key = ativopayToken;
  if (Object.keys(patch).length > 0) {
    const s = await saveSecrets(patch);
    if (!s.ok) return { ok: false, error: `Config salva, mas o token falhou: ${s.error}` };
  }

  return { ok: true, savedAt: Date.now() };
}
