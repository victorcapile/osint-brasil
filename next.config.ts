import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Esconde o indicador flutuante do Next em desenvolvimento.
  devIndicators: false,
  // jsdom é usado apenas no servidor para extrair o texto das notícias.
  serverExternalPackages: ["jsdom"],
};

export default nextConfig;
