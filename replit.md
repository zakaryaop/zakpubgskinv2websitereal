# ZakPubgSkin

## Overview
Full-stack VIP membership site for mobile gaming skins/tools. Game-card homepage, product catalog per game, **automatic Pakistani payments via SafePay** (JazzCash/Easypaisa/Meezan/banks/cards) and crypto via NOWPayments, **email-based password reset & verification via Resend**, instant Telegram VIP group activation, Google OAuth login, and a full CMS admin panel.

## Stack
- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind CSS + Wouter router (`artifacts/zakpubg`, port: 20822, path: `/`)
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL (`artifacts/api-server`, port: 8080, path: `/api`)
- **Auth**: Google OAuth (`@react-oauth/google` + `google-auth-library`) + email/password (bcrypt + JWT sessions)
- **Payments**: SafePay (PKR — auto JazzCash/Easypaisa/banks/cards) + NOWPayments (crypto USDT/BTC/BNB)
- **Email**: Resend (password reset, email verification, username reminder)
- **Telegram**: Bot API for VIP group invite links and notifications

## Artifact Routes
| Artifact | Port | Preview Path |
|---|---|---|
| Frontend (`@workspace/zakpubg`) | 20822 | `/` |
| API Server (`@workspace/api-server`) | 8080 | `/api` |

## Database Tables
- `games` — game catalog (slug, name, logo, banner, color, active)
- `products` — per-game VIP packages (title, price, duration, video, features, banner, variants JSON)
- `payments` — payment records (nowpayments_id with `safepay_` prefix for SafePay, pay_address holds SafePay tracker, status)
- `vip_memberships` — active/pending VIP records with Telegram invite links
- `users` — accounts (email, username, password hash, google_id, avatar_url, telegram_id, **email_verified**, **email_verify_token**, **email_verify_expiry**)
- `newsletter_subscribers` — newsletter signups (email unique, ip, source, active, created_at)
- `user_sessions` — JWT session tokens
- `members`, `sessions`, `login_attempts`, `secure_downloads`, `admins`, `vip_bot_users` — legacy

## Key Frontend Pages
| Route | Page |
|---|---|
| `/` | Home — game selection cards |
| `/games/:slug` | GamePage — product listing + buy button |
| `/sign-in` `/sign-up` | Auth (email/password + Google) |
| `/forgot-password` `/reset-password` `/forgot-username` | Email-based recovery |
| `/verify-email?token=…` | Email verification landing |
| `/payment-return?paymentId=…` | SafePay return/polling page |
| `/account` | User profile, Telegram ID |
| `/admin` | Admin CMS — Games, Products, Orders, Members |

## Key API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | Creates account + sends verification email |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/google` | Google token verification |
| POST | `/api/auth/forgot-password` | Sends 6-digit code via email (+ Telegram if linked) |
| POST | `/api/auth/reset-password` | Verifies code + sets new password |
| POST | `/api/auth/forgot-username` | Sends username via email |
| GET | `/api/auth/verify-email?token=…` | Marks email as verified |
| POST | `/api/auth/resend-verification` | Auth-required; resends verification email |
| POST | `/api/newsletter/subscribe` | Newsletter signup (rate-limited, sends Resend welcome email) |
| GET | `/api/newsletter/subscribers` | Admin-only list (Bearer = `ADMIN_PASSWORD`) |
| GET | `/api/games`, `/api/games/:slug/products` | Catalog |
| POST | `/api/payments/create` | Crypto invoice (NOWPayments) |
| POST | `/api/payments/webhook` | NOWPayments IPN |
| POST | `/api/payments/safepay/create` | Returns SafePay checkoutUrl + tracker |
| POST | `/api/payments/safepay/webhook` | SafePay HMAC-verified webhook |
| GET | `/api/payments/safepay/:id/status` | Polls SafePay + activates VIP on success |
| GET | `/api/my/memberships` | User's VIPs |
| `*` | `/api/admin/{games,products,payments}` | Admin CRUD |

## Environment Variables
See `.env.example`. Required: `DATABASE_URL`, `SESSION_SECRET`, `WEBHOOK_BASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`. Email: `RESEND_API_KEY`, `FROM_EMAIL`. SafePay: `SAFEPAY_API_KEY`, `SAFEPAY_SECRET`, `SAFEPAY_ENV` (`sandbox`/`production`), `USD_TO_PKR_RATE` (default 280). Optional: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID`, `VIPBOT_TOKEN`, `VIPBOT_ADMIN_CHAT_ID`, `VIP_GROUP_ID`.

## Architecture Decisions
- **Single-service production deploy**: when `NODE_ENV=production` (or `SERVE_STATIC=1`), the API server also serves the built frontend from `artifacts/zakpubg/dist/public` and falls back to `index.html` for any non-`/api/*` route. This makes Railway/Render/Heroku one-service deploys trivial.
- **SafePay flow**: backend calls `/order/v1/init` to get a tracker token, stores it as `nowpayments_id = safepay_<tracker>` (reusing the existing payments table), redirects user to the SafePay embedded checkout, then verifies on webhook (`x-sfpy-signature` HMAC-SHA256) AND/OR polls `/order/v1/<tracker>` from the return page. Activation is idempotent.
- **Email channel** added in parallel with Telegram for password reset; Telegram still fires if `telegramId` is linked.

## Deployment (Railway + GitHub)
1. Push repo to GitHub.
2. Railway → **New Project** → **Deploy from GitHub** → pick repo.
3. Add **PostgreSQL** plugin (auto-injects `DATABASE_URL`).
4. Set env vars from `.env.example`.
5. Generate public domain → set `WEBHOOK_BASE_URL` to it.
6. Configure webhooks: SafePay → `/api/payments/safepay/webhook`, NOWPayments IPN → `/api/payments/webhook`.
- Build orchestrated by `railway.json` + `nixpacks.toml`. `Procfile` provided as fallback.

## Admin Panel
URL `/admin`, default `admin` / `admin123` (change via env). Tabs: Games, Products, Orders, Members.

## Run & Operate
- Dev: workflows auto-start (`api-server` on 8080, `zakpubg` on 20822).
- DB push: `pnpm --filter @workspace/db run push`
- Typecheck libs: `pnpm run typecheck:libs`
- Build all: `pnpm -r build`
- Start prod: `NODE_ENV=production SERVE_STATIC=1 pnpm --filter @workspace/api-server start`

## Gotchas
- After schema changes in `lib/db/src/schema/index.ts`, run `pnpm run typecheck:libs` then `pnpm --filter @workspace/db run push`.
- SafePay webhook needs the raw request body for HMAC — `safepay-routes.ts` uses its own raw-body middleware on that route only, bypassing the global JSON parser.
- `USD_TO_PKR_RATE` is a static env var — adjust manually as exchange rate moves, or wire to a live rate API later.

## User Preferences
- Speaks Roman Urdu / Hindi.
- No Firebase. Auth via Replit/Google + email/password.
- Wants automatic Pakistani payments — covered by SafePay.
