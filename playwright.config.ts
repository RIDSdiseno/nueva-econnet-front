/**
 * Extremo a extremo contra el build de producción y el backend de verdad.
 * `vite preview` sirve `dist/` y pasa `/api` al backend: el navegador ve un
 * solo origen, igual que en producción detrás del mismo dominio.
 */
import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:4173";

/* Para entornos que ya traen Chromium instalado y no pueden descargarlo
   (contenedores sin salida a internet): PLAYWRIGHT_CHROMIUM_PATH apunta al
   binario. Sin esa variable, Playwright usa el suyo, como en CI. */
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
    locale: "es-CL",
    ...(CHROMIUM ? { launchOptions: { executablePath: CHROMIUM } } : {})
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  /* Si E2E_BASE_URL viene de fuera, es que alguien ya levantó la web. */
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          /* API_URL (no VITE_API_URL) para que el catálogo entre en el
             prerenderizado sin acabar horneado en el bundle del navegador. */
          command: "API_URL=http://localhost:3000 npm run build && npm run preview -- --port 4173 --strictPort",
          url: BASE,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000
        }
      })
});
