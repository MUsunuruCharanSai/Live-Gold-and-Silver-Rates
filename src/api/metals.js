const TROY_OUNCE_IN_GRAMS = 31.1034768
const useLocalProxy = import.meta.env.DEV

const GOLD_SPOT_URL = useLocalProxy
  ? '/api/spot/gold'
  : (import.meta.env.VITE_GOLD_SPOT_URL || 'https://api.gold-api.com/price/XAU')
const SILVER_SPOT_URL = useLocalProxy
  ? '/api/spot/silver'
  : (import.meta.env.VITE_SILVER_SPOT_URL || 'https://api.gold-api.com/price/XAG')
const FX_URL = useLocalProxy
  ? '/api/fx'
  : (import.meta.env.VITE_FX_URL || 'https://open.er-api.com/v6/latest/USD')
const INDIA_SHOP_URL = useLocalProxy
  ? '/api/india-shop'
  : (import.meta.env.VITE_INDIA_SHOP_URL || 'https://ibjarates.com/')
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
  const response = await request(url)
  return response.json()
}

async function getText(url) {
  const response = await request(url)
  return response.text()
}

async function request(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`Could not load rates (${response.status})`)
    }

    return response
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

function pickNumber(...values) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number) && number > 0) return number
  }
  return null
}

function readIbjaValue(html, id) {
  const match = html.match(new RegExp(`id=["']${id}["'][^>]*>\\s*([0-9,.]+)`))
  if (!match) return null
  return pickNumber(match[1].replace(/,/g, ''))
}

function readIbjaPmOrAm(html, name) {
  return pickNumber(readIbjaValue(html, `${name}_PM`), readIbjaValue(html, `${name}_AM`))
}

function buildGoldRates(perGram24k, perOunce, extra = {}) {
  if (!perGram24k) {
    return { available: false, perGram: {}, perOunce: null }
  }

  return {
    available: true,
    perOunce,
    per10g: extra.per10g || perGram24k * 10,
    perGram: {
      '24K': perGram24k,
      '22K': extra.perGram22k || perGram24k * (22 / 24),
      '18K': extra.perGram18k || perGram24k * (18 / 24),
    },
    changePercent: null,
    label: extra.label || 'International spot',
    source: extra.source || 'Live spot + FX',
  }
}

function buildSilverRates(perGram999, perOunce, extra = {}) {
  if (!perGram999) {
    return { available: false, perGram: {}, perOunce: null }
  }

  return {
    available: true,
    perOunce,
    per10g: extra.per10g || perGram999 * 10,
    perGram: {
      '999': perGram999,
      '925': extra.perGram925 || perGram999 * (0.925 / 0.999),
      '800': extra.perGram800 || perGram999 * (0.8 / 0.999),
    },
    changePercent: null,
    label: extra.label || 'International spot',
    source: extra.source || 'Live spot + FX',
  }
}

function parseIndiaShopRates(html) {
  // IBJA gold is published per 10 grams. Silver 999 is per 1 kg.
  const gold10g24k = readIbjaPmOrAm(html, 'lblGold999')
  const gold10g22k = readIbjaPmOrAm(html, 'lblGold916')
  const gold10g18k = readIbjaPmOrAm(html, 'lblGold750')
  const silverPerKg = readIbjaPmOrAm(html, 'lblSilver999')

  const goldShop = gold10g24k
    ? buildGoldRates(gold10g24k / 10, null, {
      perGram22k: gold10g22k ? gold10g22k / 10 : null,
      perGram18k: gold10g18k ? gold10g18k / 10 : null,
      per10g: gold10g24k,
      label: 'India shop rate',
      source: 'IBJA',
    })
    : { available: false, perGram: {} }

  const silverGram = silverPerKg ? silverPerKg / 1000 : null
  const silverShop = silverGram
    ? buildSilverRates(silverGram, null, {
      per10g: silverGram * 10,
      label: 'India shop rate',
      source: 'IBJA',
    })
    : { available: false, perGram: {} }

  if (!goldShop.available && !silverShop.available) {
    throw new Error('India shop rates could not be read.')
  }

  return { goldShop, silverShop }
}

export async function fetchLiveRates() {
  const [goldResult, silverResult, fxResult, shopResult] = await Promise.allSettled([
    getJson(GOLD_SPOT_URL),
    getJson(SILVER_SPOT_URL),
    getJson(FX_URL),
    getText(INDIA_SHOP_URL),
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

  if (shopResult.status === 'fulfilled') {
    try {
      const shop = parseIndiaShopRates(shopResult.value)
      goldShop = shop.goldShop
      silverShop = shop.silverShop
    } catch (err) {
      warnings.push('India shop rates could not be read right now.')
    }
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
