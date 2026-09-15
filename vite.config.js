import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "Vanza — Salario Bajo Demanda",
        short_name: "Vanza",
        description: "Adelantos de nómina para empresas dominicanas. Tu salario, disponible antes de la quincena.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#241726",
        theme_color: "#241726",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
