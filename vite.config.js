import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadIndiaShopRates } from './src/api/ibja.js'

function indiaShopPlugin() {
  async function handle(req, res, next) {
    if (req.url.split('?')[0] !== '/api/india-shop') {
      next()
      return
    }

    try {
      const data = await loadIndiaShopRates()
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    } catch (err) {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err.message || 'India shop rates unavailable' }))
    }
  }

  return {
    name: 'india-shop-api',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}

const proxy = {
  '/api/spot/gold': {
    target: 'https://api.gold-api.com',
    changeOrigin: true,
    rewrite: () => '/price/XAU',
  },
  '/api/spot/silver': {
    target: 'https://api.gold-api.com',
    changeOrigin: true,
    rewrite: () => '/price/XAG',
  },
  '/api/fx': {
    target: 'https://open.er-api.com',
    changeOrigin: true,
    rewrite: () => '/v6/latest/USD',
  },
}

export default defineConfig({
  plugins: [react(), indiaShopPlugin()],
  server: { proxy },
  preview: { proxy },
})
