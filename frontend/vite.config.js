import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: 'https://k5-teamproj.icysea-5b3a24a1.germanywestcentral.azurecontainerapps.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, '/api/v1'),
      },
      '/api/ai': {
        // Route AI requests to the production ProxyAPI container app
        target: 'https://proxyapi.icysea-5b3a24a1.germanywestcentral.azurecontainerapps.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/api/Ai'),
      },
      '/api': {
        target: 'http://localhost:5002', // Local TimelogAPI during development (docker)
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  preview: {
    port: 4173,
  }
})
