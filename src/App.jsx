import Header from './components/Header'
import StatusBar from './components/StatusBar'
import RateCard from './components/RateCard'
import MetalCalculator from './components/MetalCalculator'
import { useLiveRates } from './hooks/useLiveRates'
import { GOLD_PURITIES, SILVER_PURITIES } from './api/metals'
import './App.css'

function App() {
  const {
    rates,
    loading,
    refreshing,
    error,
    lastUpdated,
    secondsLeft,
    refresh,
  } = useLiveRates()

  return (
    <div className="page">
      <Header />

      <main className="shell">
        <StatusBar
          loading={loading}
          refreshing={refreshing}
          error={error}
          lastUpdated={lastUpdated}
          secondsLeft={secondsLeft}
          onRefresh={refresh}
        />

        {error && (
          <div className="banner error">
            <p>{error}</p>
            {rates && <p className="tiny">Showing the last successful rates until the next refresh.</p>}
          </div>
        )}

        {rates?.warnings?.length > 0 && !error && (
          <div className="banner warn">
            {rates.warnings.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        )}

        <section className="grid">
          <RateCard
            title="Live Gold Rate"
            metal="gold"
            rate={rates?.gold}
            highlightKey="24K"
            extraLabel="24K"
            loading={loading && !rates}
          />
          <RateCard
            title="Live Silver Rate"
            metal="silver"
            rate={rates?.silver}
            highlightKey="999"
            extraLabel="999 Fine"
            loading={loading && !rates}
          />
          <MetalCalculator
            title="Gold Calculator"
            metal="gold"
            purities={GOLD_PURITIES}
            rates={rates?.gold}
            defaultPurity="22K"
            placeholder="₹10,000"
            loading={loading && !rates}
          />
          <MetalCalculator
            title="Silver Calculator"
            metal="silver"
            purities={SILVER_PURITIES}
            rates={rates?.silver}
            defaultPurity="999"
            placeholder="₹10,000"
            loading={loading && !rates}
          />
        </section>

        <footer className="site-footer">
          <p>
            International spot is the global metal price. India shop rates are IBJA board rates,
            without 3% GST and making charges.
          </p>
          {rates?.source && <p className="tiny">Source: {rates.source}</p>}
        </footer>
      </main>
    </div>
  )
}

export default App
