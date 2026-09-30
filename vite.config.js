import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  '/api/india-shop': {
    target: 'https://ibjarates.com',
    changeOrigin: true,
    rewrite: () => '/',
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})
