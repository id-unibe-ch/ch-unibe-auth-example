// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readFileSync } from 'node:fs';

// Local HTTPS for the dev server: active when a certificate exists in .certs/ (see README,
// "HTTPS locally"). Needed for providers that accept https redirect URIs only, e.g. SWITCH.
const devCert = '.certs/localhost.pem';
const devKey = '.certs/localhost-key.pem';
const devHttps =
  existsSync(devCert) && existsSync(devKey) ? { cert: readFileSync(devCert), key: readFileSync(devKey) } : undefined;

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
    server: { https: devHttps },
  },
});
