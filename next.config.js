/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // URL com extensao .csv para o conector do Google Ads (que exige .csv/.tsv).
      { source: "/conversoes.csv", destination: "/api/vendas/export" },
    ];
  },
};

module.exports = nextConfig;
