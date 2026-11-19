// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Production URL; locally APP_BASE_URL from the environment is used (see src/lib/config.ts).
  site: 'https://login-example.campus.cloud',
  security: {
    // Protects the POST forms (sign-out, unlink, delete) against cross-site requests.
    checkOrigin: true,
    // Behind the Container Apps ingress: trust X-Forwarded-Host/-Proto for these hosts only,
    // so Astro.url (and the origin check) use the public HTTPS URL.
    allowedDomains: [
      { hostname: 'login-example.campus.cloud', protocol: 'https' },
      { hostname: '**.azurecontainerapps.io', protocol: 'https' },
    ],
  },
  session: {
    // Azure SQL (dbo.sessions); in memory without a database configuration. See src/lib/session-driver.ts
    driver: { entrypoint: new URL('./src/lib/session-driver.ts', import.meta.url) },
    ttl: 60 * 60 * 8,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
