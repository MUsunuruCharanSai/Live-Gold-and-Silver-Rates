import { useMemo, useState } from 'react'
import { formatGrams, formatInr, parseAmount } from '../utils/format'

function MetalCalculator({ title, metal, purities, rates, defaultPurity, placeholder, loading }) {
  const [amount, setAmount] = useState('10000')
  const [purity, setPurity] = useState(defaultPurity)
  const [source, setSource] = useState('shop')

  const shopReady = Boolean(rates?.shop?.available)
  const activeRates = source === 'shop' && shopReady ? rates.shop : rates
  const numericAmount = parseAmount(amount)
  const pricePerGram = activeRates?.available ? activeRates.perGram[purity] : null

  const grams = useMemo(() => {
    if (!pricePerGram || numericAmount <= 0) return 0
    return numericAmount / pricePerGram
  }, [numericAmount, pricePerGram])

  if (loading) {
    return (
      <article className={`calc-card ${metal}`}>
        <p className="card-kicker">{title}</p>
        <div className="skeleton title" />
        <div className="skeleton price" />
        <div className="skeleton line" />
      </article>
    )
  }

  if (!rates?.available) {
    return (
      <article className={`calc-card ${metal}`}>
        <p className="card-kicker">{title}</p>
        <h3>Calculator unavailable</h3>
        <p className="muted">Waiting for a live {metal} rate before we can calculate quantity.</p>
      </article>
    )
  }

  return (
    <article className={`calc-card ${metal}`}>
      <p className="card-kicker">{title}</p>
      <h3>How much can you buy?</h3>

      {shopReady && (
        <div className="source-row" role="tablist" aria-label="Rate source">
          <button
            type="button"
            className={source === 'shop' ? 'is-active' : ''}
            onClick={() => setSource('shop')}
          >
            India shop
          </button>
          <button
            type="button"
            className={source === 'spot' ? 'is-active' : ''}
            onClick={() => setSource('spot')}
          >
            International
          </button>
        </div>
      )}

      <label className="field">
        <span>Amount in INR</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          placeholder={placeholder}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>

      <div className="purity-row" role="tablist" aria-label={`${metal} purity`}>
        {purities.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === purity ? 'is-active' : ''}
            onClick={() => setPurity(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="calc-result">
        <p className="muted">Estimated quantity</p>
        <strong>{formatGrams(grams)}</strong>
        <p className="tiny">
          Using {formatInr(pricePerGram)} / gram for {purity} ({activeRates.label || 'live rate'})
        </p>
      </div>
    </article>
  )
}

export default MetalCalculator
