import { loadIndiaShopRates } from '../src/api/ibja.js'

export default async function handler(req, res) {
  try {
    const data = await loadIndiaShopRates()
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ error: err.message || 'India shop rates unavailable' })
  }
}
