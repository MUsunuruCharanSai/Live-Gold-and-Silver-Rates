# Live Gold and Silver Rates

Vite + React app for live gold and silver prices in INR, with quantity calculators.

Live site: [https://live-gold-and-silver-rates.vercel.app/](https://live-gold-and-silver-rates.vercel.app/)

## Run it

```bash
npm install
npm run dev
```

API settings live in `.env`. The app uses public gold/silver spot APIs plus IBJA India shop rates.

Rates refresh every 30 seconds.

## Deploy on Vercel

1. Push the project to GitHub.
2. Open [vercel.com](https://vercel.com) and import that repo.
3. Keep the defaults for a Vite app:
   - Framework: **Vite**
   - Build command: `npm run build`
   - Output: `dist`
4. Click **Deploy**.

`vercel.json` already proxies the rate APIs, so live spot and India shop rates work after deploy. You do not need to add environment variables unless you change the defaults.
