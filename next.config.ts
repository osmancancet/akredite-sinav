import type { NextConfig } from "next";

// AkrediteSınav tamamen istemci tarafında çalışan, sunucusuz (static export) bir SPA'dır.
// `next build` çıktısı `out/` klasörüne yazılır ve herhangi bir statik sunucudan
// (veya USB bellekten) servis edilebilir. Hiçbir sunucu tarafı veri işleme yoktur.
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
