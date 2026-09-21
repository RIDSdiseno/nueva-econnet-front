import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    /* En desarrollo, /api va al backend: así el navegador ve un solo origen
       y no hay que pelearse con CORS mientras se programa. */
    proxy: {
      "/api": { target: process.env.VITE_API_URL ?? "http://localhost:3000", changeOrigin: true }
    }
  },
  /* `preview` sirve el build ya hecho; es lo que usan las pruebas de extremo a
     extremo, para probar lo que se despliega y no lo que sirve el dev server. */
  preview: {
    port: 4173,
    proxy: {
      "/api": { target: process.env.VITE_API_URL ?? "http://localhost:3000", changeOrigin: true }
    }
  },
  build: { outDir: "dist", sourcemap: false, target: "es2022" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/preparar.ts"],
    include: ["tests/**/*.test.tsx", "tests/**/*.test.ts"]
  }
});
