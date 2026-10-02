import { formatInr, formatNumber } from '../utils/format'

function PriceBlock({ value, extraLabel, compact }) {
  return (
    <>
      <div className={`price-block ${compact ? 'is-compact' : ''}`}>
        <span className="rupee">₹</span>
        <span className="price">{formatNumber(value, 0)}</span>
      </div>
      <p className="unit">per gram ({extraLabel})</p>
    </>
  )
}

function RateCard({ title, metal, rate, highlightKey, extraLabel, loading }) {
  if (loading) {
    return (
      <article className={`rate-card ${metal}`}>
        <p className="card-kicker">{title}</p>
        <div className="skeleton title" />
        <div className="skeleton price" />
        <div className="skeleton line" />
      </article>
    )
  }

  if (!rate?.available) {
    return (
      <article className={`rate-card ${metal}`}>
        <p className="card-kicker">{title}</p>
        <h2>Rate unavailable</h2>
        <p className="muted">We could not load this metal right now. Please try refresh.</p>
      </article>
    )
  }

  const shop = rate.shop
  const purityKeys = Object.keys(shop?.available ? shop.perGram : rate.perGram).sort((a, b) => {
    const order = ['24K', '22K', '18K', '999', '925', '800']
    return order.indexOf(a) - order.indexOf(b)
  })
  const chipRates = shop?.available ? shop : rate

  return (
    <article className={`rate-card ${metal}`}>
      <div className="card-top">
        <p className="card-kicker">{title}</p>
      </div>

      <div className="rate-compare">
        <div className="rate-box">
          <p className="rate-label">International spot</p>
          <PriceBlock value={rate.perGram[highlightKey]} extraLabel={extraLabel} compact />
          <p className="tiny">10 grams {formatInr(rate.per10g, 0)}</p>
        </div>

        {shop?.available ? (
          <div className="rate-box is-shop">
            <p className="rate-label">India shop rate</p>
            <PriceBlock value={shop.perGram[highlightKey]} extraLabel={extraLabel} compact />
            <p className="tiny">10 grams {formatInr(shop.per10g, 0)}</p>
          </div>
        ) : (
          <div className="rate-box">
            <p className="rate-label">India shop rate</p>
            <p className="muted">Not available right now.</p>
          </div>
        )}
      </div>

      <ul className="purity-prices">
        {purityKeys.map((key) => (
          <li key={key} className={key === highlightKey ? 'is-current' : ''}>
            <span>{key}</span>
            <strong>{formatInr(chipRates.perGram[key], 0)}</strong>
          </li>
        ))}
      </ul>
      <p className="tiny chip-note">
        {shop?.available ? 'Purity prices above are India shop rates (IBJA).' : 'Purity prices above are international spot.'}
      </p>
    </article>
  )
}

export default RateCard
