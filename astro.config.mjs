// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Produktive URL; lokal wird APP_BASE_URL aus der Umgebung verwendet (siehe src/lib/config.ts).
  site: 'https://login-example.campus.cloud',
  security: {
    // Schützt POST-Formulare (Logout, Trennen) gegen Cross-Site-Requests.
    checkOrigin: true,
  },
  session: {
    // Vorläufig: Standard-Treiber des Node-Adapters (Dateisystem).
    // Wird durch einen Azure-SQL-Treiber ersetzt (siehe docs/06-hosting-and-data.md).
    ttl: 60 * 60 * 8,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
