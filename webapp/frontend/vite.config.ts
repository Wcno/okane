import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { ProxyOptions } from 'vite'
import { defineConfig } from 'vitest/config'

// The dev server sends backend paths to a running stack, so sessions work as in
// production. The Origin header is dropped because webapp compares it with its
// own host for CSRF, and the dev server runs on another port.
const backend: ProxyOptions = {
  target: process.env.OKANE_BACKEND_URL ?? 'http://localhost:8000',
  changeOrigin: true,
  configure: (proxy) => proxy.on('proxyReq', (request) => request.removeHeader('origin')),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { setupFiles: ['./src/test/setup.ts'] },
  server: {
    proxy: { '/auth': backend, '/api': backend, '/health': backend },
  },
})
