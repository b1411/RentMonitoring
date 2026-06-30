import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  // Pin web to 3002 on IPv4 so it never collides with the API on 3001 (ТЗ stack runs both).
  devServer: { port: 3002, host: '127.0.0.1' },
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      // 127.0.0.1 (not localhost) to dodge IPv4/IPv6 dual-stack ambiguity on Windows.
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:3001/api',
    },
  },
  app: {
    head: {
      title: 'RentMonitoring — Floor Map',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Interactive commercial floor-plan rental map' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap',
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
});
