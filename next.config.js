/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Inclui o schema.sql no bundle da rota de migração (lido em runtime).
  experimental: {
    outputFileTracingIncludes: {
      "/api/admin/migrate": ["./supabase/schema.sql"],
    },
  },
  async rewrites() {
    return [
      // URL com extensao .csv para o conector do Google Ads (que exige .csv/.tsv).
      { source: "/conversoes.csv", destination: "/api/vendas/export" },
    ];
  },
};

module.exports = nextConfig;
