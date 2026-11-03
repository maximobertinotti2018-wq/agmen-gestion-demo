// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  // El servidor estático de Python atiende mejor pocas conexiones simultáneas.
  workers: 3,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5521',
    // Usa el Google Chrome instalado: no hace falta descargar navegadores de Playwright.
    channel: 'chrome',
    viewport: { width: 1366, height: 900 },
    locale: 'es-AR',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python -m http.server 5521 --bind 127.0.0.1',
    url: 'http://127.0.0.1:5521/index.html',
    reuseExistingServer: true,
  },
});
