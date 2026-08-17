import { cookies } from "next/headers";
import { createHash } from "crypto";

// ==========================================================================
// Autenticacao simples do painel /admin, baseada em senha + cookie.
// ==========================================================================

const COOKIE_NAME = "fusiads_admin";

function expectedToken(): string | null {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return null;
  // Token derivado da senha; nao guardamos a senha em texto no cookie.
  return createHash("sha256").update(`fusiads:${pass}`).digest("hex");
}

export function verifyPassword(input: string): boolean {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return false;
  return input === pass;
}

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

export function sessionCookieValue(): string | null {
  return expectedToken();
}

// Le o cookie da requisicao atual e diz se o admin esta logado.
export function isAuthenticated(): boolean {
  const token = expectedToken();
  if (!token) return false;
  const cookie = cookies().get(COOKIE_NAME)?.value;
  return cookie === token;
}
