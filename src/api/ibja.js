export function pickNumber(...values) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number) && number > 0) return number
  }
  return null
}

export function buildGoldRates(perGram24k, perOunce, extra = {}) {
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

export function buildSilverRates(perGram999, perOunce, extra = {}) {
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

function readIbjaValue(html, id) {
  const match = html.match(new RegExp(`id=["']${id}["'][^>]*>\\s*([0-9,.]+)`))
  if (!match) return null
  return pickNumber(match[1].replace(/,/g, ''))
}

function readIbjaPmOrAm(html, name) {
  return pickNumber(readIbjaValue(html, `${name}_PM`), readIbjaValue(html, `${name}_AM`))
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

export function parseIndiaShopRates(html) {
  const gold10g24k = readIbjaPmOrAm(html, 'lblGold999')
  const gold10g22k = readIbjaPmOrAm(html, 'lblGold916')
  const gold10g18k = readIbjaPmOrAm(html, 'lblGold750')
  const silverPerKg = readIbjaPmOrAm(html, 'lblSilver999')

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

export async function loadIndiaShopRates() {
  const response = await fetch('https://ibjarates.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LiveGoldRates/1.0)',
    },
  })

  if (!response.ok) {
    throw new Error(`IBJA request failed (${response.status})`)
  }

  const html = await response.text()
  return parseIndiaShopRates(html)
}
