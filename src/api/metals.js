const TROY_OUNCE_IN_GRAMS = 31.1034768

// Same paths locally (Vite proxy) and on Vercel (vercel.json rewrites)
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
  const response = await request(url)
  return response.json()
}

async function getText(url) {
  const response = await request(url)
  return response.text()
}

async function request(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)

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

function lastChartValue(html, inputId, key) {
  const match = html.match(new RegExp(`id=["']${inputId}["'][^>]*value="([^"]+)"`))
  if (!match) return null

  try {
    const data = JSON.parse(match[1].replace(/&quot;/g, '"'))
    const values = data[key]
    if (Array.isArray(values) && values.length) {
      return pickNumber(values[values.length - 1])
    }
  } catch {
    return null
  }

  return null
}

function parseIndiaShopRates(html) {
  // Working days: gold AM/PM is per 10 grams, silver AM/PM is per 1 kg.
  const gold10g24k = readIbjaPmOrAm(html, 'lblGold999')
  const gold10g22k = readIbjaPmOrAm(html, 'lblGold916')
  const gold10g18k = readIbjaPmOrAm(html, 'lblGold750')
  const silverPerKg = readIbjaPmOrAm(html, 'lblSilver999')

  // Holidays: IBJA hides AM/PM, but still shows last per-gram gold cards.
  const goldGram24k = gold10g24k
    ? gold10g24k / 10
    : readIbjaValue(html, 'GoldRatesCompare999')
  const goldGram22k = gold10g22k
    ? gold10g22k / 10
    : readIbjaValue(html, 'GoldRatesCompare916')
  const goldGram18k = gold10g18k
    ? gold10g18k / 10
    : readIbjaValue(html, 'GoldRatesCompare750')
  const silverKg = silverPerKg || lastChartValue(html, 'HdnSilver', 'silverRate')
  const isHoliday = /id=["']lbl_Message["'][^>]*>\s*Holiday/i.test(html)

  const goldShop = goldGram24k
    ? buildGoldRates(goldGram24k, null, {
      perGram22k: goldGram22k,
      perGram18k: goldGram18k,
      per10g: goldGram24k * 10,
      label: isHoliday ? 'India shop rate (holiday)' : 'India shop rate',
      source: 'IBJA',
    })
    : { available: false, perGram: {} }

  const silverGram = silverKg ? silverKg / 1000 : null
  const silverShop = silverGram
    ? buildSilverRates(silverGram, null, {
      per10g: silverGram * 10,
      label: isHoliday ? 'India shop rate (holiday)' : 'India shop rate',
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
