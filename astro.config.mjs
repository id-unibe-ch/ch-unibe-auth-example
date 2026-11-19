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
    // Hinter dem Ingress von Container Apps: X-Forwarded-Host/-Proto nur für diese Hosts vertrauen,
    // damit Astro.url (und die Origin-Prüfung) die öffentliche HTTPS-URL verwendet.
    allowedDomains: [
      { hostname: 'login-example.campus.cloud', protocol: 'https' },
      { hostname: '**.azurecontainerapps.io', protocol: 'https' },
    ],
  },
  session: {
    // Azure SQL (dbo.sessions); ohne Datenbank-Konfiguration In-Memory. Siehe src/lib/session-driver.ts
    driver: { entrypoint: new URL('./src/lib/session-driver.ts', import.meta.url) },
    ttl: 60 * 60 * 8,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
