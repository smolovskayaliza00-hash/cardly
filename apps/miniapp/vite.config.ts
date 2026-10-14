import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Относительный base + HashRouter: сборка работает по любому пути
  // (GitHub Pages /cardapp/, Vercel, локальный туннель).
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // Разрешаем открывать dev-сервер через HTTPS-туннель (cloudflared / ngrok)
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});
