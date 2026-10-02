import { buildGoldRates, buildSilverRates, pickNumber } from './ibja.js'

const TROY_OUNCE_IN_GRAMS = 31.1034768
const GOLD_SPOT_URL = '/api/spot/gold'
const SILVER_SPOT_URL = '/api/spot/silver'
const FX_URL = '/api/fx'
const INDIA_SHOP_URL = '/api/india-shop'
const CURRENCY = import.meta.env.VITE_CURRENCY || 'INR'

export const GOLD_PURITIES = [
  { id: '24K', label: '24K', ratio: 1 },
  { id: '22K', label: '22K', ratio: 22 / 24 },
  { id: '18K', label: '18K', ratio: 18 / 24 },
]

export const SILVER_PURITIES = [
  { id: '999', label: '999 Fine', ratio: 0.999 },
  { id: '925', label: '925 Sterling', ratio: 0.925 },
  { id: '800', label: '800', ratio: 0.8 },
]

async function getJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`Could not load rates (${response.status})`)
    }

    return await response.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The request timed out. Please try again.')
    }

    if (err instanceof TypeError) {
      throw new Error('Network error. Please check your internet connection.')
    }

    throw err
  } finally {
    clearTimeout(timer)
  }
}

function gramFromOunce(pricePerOunce) {
  return pricePerOunce / TROY_OUNCE_IN_GRAMS
}

export async function fetchLiveRates() {
  const [goldResult, silverResult, fxResult, shopResult] = await Promise.allSettled([
    getJson(GOLD_SPOT_URL),
    getJson(SILVER_SPOT_URL),
    getJson(FX_URL),
    getJson(INDIA_SHOP_URL),
  ])

  if (fxResult.status !== 'fulfilled') {
    throw fxResult.reason || new Error('Could not load the INR exchange rate.')
  }

  const inrRate = Number(fxResult.value?.rates?.[CURRENCY])
  if (!Number.isFinite(inrRate) || inrRate <= 0) {
    throw new Error('INR exchange rate is unavailable right now.')
  }

  const goldUsd = goldResult.status === 'fulfilled'
    ? pickNumber(goldResult.value.price)
    : null
  const silverUsd = silverResult.status === 'fulfilled'
    ? pickNumber(silverResult.value.price)
    : null

  if (!goldUsd && !silverUsd) {
    throw new Error('Gold and silver rates are unavailable right now.')
  }

  const goldInrPerOz = goldUsd ? goldUsd * inrRate : null
  const silverInrPerOz = silverUsd ? silverUsd * inrRate : null
  const goldUpdatedAt = goldResult.status === 'fulfilled' ? goldResult.value.updatedAt : null
  const silverUpdatedAt = silverResult.status === 'fulfilled' ? silverResult.value.updatedAt : null

  let goldShop = { available: false, perGram: {} }
  let silverShop = { available: false, perGram: {} }
  const warnings = [
    goldResult.status === 'rejected' ? 'International gold rate could not be loaded.' : null,
    silverResult.status === 'rejected' ? 'International silver rate could not be loaded.' : null,
  ]

  if (shopResult.status === 'fulfilled' && shopResult.value?.goldShop) {
    goldShop = shopResult.value.goldShop
    silverShop = shopResult.value.silverShop || silverShop
  } else {
    warnings.push('India shop rates could not be loaded right now.')
  }

  return {
    currency: CURRENCY,
    source: 'Live spot + IBJA shop rates',
    updatedAt: new Date(goldUpdatedAt || silverUpdatedAt || Date.now()),
    gold: {
      ...buildGoldRates(goldInrPerOz ? gramFromOunce(goldInrPerOz) : null, goldInrPerOz),
      shop: goldShop,
    },
    silver: {
      ...buildSilverRates(silverInrPerOz ? gramFromOunce(silverInrPerOz) : null, silverInrPerOz),
      shop: silverShop,
    },
    warnings: warnings.filter(Boolean),
  }
}
