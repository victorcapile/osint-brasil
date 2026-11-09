import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Esconde o indicador flutuante do Next em desenvolvimento.
  devIndicators: false,
  // postgres é usado apenas no servidor; linkedom/Readability são empacotados.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
