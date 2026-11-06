import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png", "icons/icono.svg"],
      manifest: {
        name: "Míster · Entrenador de fútbol",
        short_name: "Míster",
        description: "Plantilla, ejercicios, sesiones, partidos y alineaciones de tu equipo.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0F6B45",
        theme_color: "#0F6B45",
        icons: [
          { src: "/icons/icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: { cacheName: "fuentes", expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ],
  server: { port: 5173 }
});
