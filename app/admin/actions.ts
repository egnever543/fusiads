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
      weight: Number(formData.get(`phone_${i}_weight`) ?? 1),
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
  });

  const result = await saveConfig(config);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, savedAt: Date.now() };
}
