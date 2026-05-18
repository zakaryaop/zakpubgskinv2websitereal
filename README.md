# ZakPubgSkin

VIP membership storefront for mobile gaming skins/tools. Game-card homepage, per-game product catalog, automatic Pakistani payments via **SafePay** (JazzCash, Easypaisa, banks, cards) plus crypto via **NOWPayments**. Email-based password reset & verification via **Resend**. Optional **Google OAuth** sign-in. Optional **Telegram** VIP-group invite-link delivery. Full admin CMS.

---

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | React 18 + Vite + Tailwind + Wouter |
| Backend | Express 5 + Drizzle ORM + PostgreSQL |
| Auth | Email/password (bcrypt + JWT) + Google OAuth |
| Payments | SafePay (PKR) + NOWPayments (crypto) |
| Email | Resend |
| Telegram | Bot API (optional) |

---

## Local development

```bash
pnpm install
# Set DATABASE_URL in your env
pnpm --filter @workspace/db run push
# Start (Replit handles workflows automatically)
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/zakpubg run dev
```

Copy `.env.example` → `.env` and fill in values. Only `DATABASE_URL` and `SESSION_SECRET` are strictly required for boot.

---

## Deploying to Railway

This project is set up for **single-service** Railway deployment — the API server serves both `/api/*` routes and the built frontend.

### Steps

1. Push this repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → pick this repo.
3. **Add PostgreSQL plugin** (Railway Marketplace → Postgres). It auto-injects `DATABASE_URL`.
4. Open your service → **Variables** tab → add the env vars from `.env.example` (everything except `DATABASE_URL`).
5. **Settings → Networking** → Generate a public domain (or attach your custom domain).
6. Update `WEBHOOK_BASE_URL` to that domain (e.g. `https://zakpubgskin.up.railway.app`).
7. Trigger a redeploy. Railway will:
   - Run `pnpm install`
   - Build the frontend (`vite build`)
   - Build the backend (`esbuild`)
   - Push DB schema (`drizzle-kit push`)
   - Start the server (`node dist/index.mjs`)

The build is configured via `railway.json` and `nixpacks.toml`. `Procfile` is provided as a fallback for other PaaS providers (Heroku, Render, etc.).

### Webhooks to configure

| Service | URL |
|---|---|
| **SafePay** | `https://YOUR_DOMAIN/api/payments/safepay/webhook` |
| **NOWPayments IPN** | `https://YOUR_DOMAIN/api/payments/webhook` |

---

## Required environment variables

See [`.env.example`](./.env.example). Critical ones:

- `DATABASE_URL` — Postgres connection string (from Railway plugin)
- `SESSION_SECRET` — long random string
- `WEBHOOK_BASE_URL` — your public HTTPS domain
- `RESEND_API_KEY` + `FROM_EMAIL` — for sending emails
- `SAFEPAY_API_KEY` + `SAFEPAY_SECRET` + `SAFEPAY_ENV` — for Pakistani payments
- `ADMIN_USERNAME` + `ADMIN_PASSWORD` — admin panel credentials

---

## Admin panel

Visit `/admin` and log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Manage games, products, payments, and members from there.

---

## Architecture notes

- The API server (`artifacts/api-server`) listens on `PORT` (Railway-assigned in production, 8080 locally).
- In production (`NODE_ENV=production` or `SERVE_STATIC=1`), the API server also serves the built frontend from `artifacts/zakpubg/dist/public` and falls back to `index.html` for client-side routes.
- Database schema lives in `lib/db/src/schema/index.ts`. Apply changes with `pnpm --filter @workspace/db run push`.
- See [`replit.md`](./replit.md) for a detailed file-tree map and route reference.
