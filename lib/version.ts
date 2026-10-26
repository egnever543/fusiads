// Versão do sistema exibida no painel admin. BUMP a cada deploy relevante —
// assim dá pra ver, abrindo o /admin de cada cliente, se a conta subiu o
// deploy mais recente ou ficou para trás.
export const APP_VERSION = "1.0.0";

// Commit do build (preenchido automaticamente pela Vercel). É o "carimbo" real
// do deploy: duas contas com commits diferentes estão em versões diferentes.
export function buildCommit(): string | null {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "";
  return sha ? sha.slice(0, 7) : null;
}

// Texto pronto para exibir, ex.: "v1.0.0 · a1b2c3d".
export function versionLabel(): string {
  const commit = buildCommit();
  return commit ? `v${APP_VERSION} · ${commit}` : `v${APP_VERSION}`;
}
