# Arc P2P Payments

Modern peer-to-peer payment system. This sample application uses Next.js, Supabase, and Circle Modular Wallets with Passkey security to demonstrate a seamless, gasless P2P payment system on the Arc Network.

<img alt="P2P Payments dashboard" src="public/screenshot.png" />

> [!WARNING]
> **The onramp defaults to sandbox, and leaving it that way is deliberate.**
> `ONRAMP_API_BASE_URL` and `NEXT_PUBLIC_ONRAMP_WIDGET_BASE_URL` are set to
> Circle's sandbox endpoints in `.env.example`. If either is unset or empty, the
> app targets Circle's production endpoints on mainnet, where **every purchase
> charges a real payment method**. Setting only one of them is refused at
> startup.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [Environment Variables](#environment-variables)
- [User Accounts](#user-accounts)
- [Available Scripts](#available-scripts)
- [Security & Usage Model](#security--usage-model)

## Features

The app is laid out as a phone screen with a bottom tab bar:

- **Phone sign-in** (`/sign-in`, `/code-confirmation`) — Sign in with a phone number and a one-time code from Supabase Auth.
- **Onboarding** (`/onboarding`, `/dashboard/setup-wallet`) — Set your name and username, then create a Modular Wallet smart account secured by a passkey.
- **Balance** (`BalanceTab`) — Your USDC balance on Arc Testnet, updated in real time.
- **Fund Wallet** (`FundWalletButton`) — Buy USDC with fiat straight into your wallet through Circle's onramp widget, shown over the phone screen. Sandbox only, see the warning above.
- **Send** (`WalletTab`) — Find a recipient by name, username, or email, or paste an address, then send USDC with gas covered by a paymaster.
- **Transactions** (`TransactionsTab`) — Your payment history grouped by month, with a detail page at `/dashboard/transaction/[id]`.

## Prerequisites

- **Node.js v22+** — Install via [nvm](https://github.com/nvm-sh/nvm) (`nvm use` will read the `.nvmrc` file)
- **Supabase CLI** — Install via `npm install -g supabase` or see [Supabase CLI docs](https://supabase.com/docs/guides/cli/getting-started)
- **Docker Desktop** — [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Circle **[API key](https://console.circle.com/signin)** and **[Entity Secret](https://developers.circle.com/wallets/dev-controlled/register-entity-secret)**
- Circle Modular Wallets **client key** — from the [Circle Console](https://console.circle.com/)

## Getting Started

1. Clone the repository and install dependencies:

   ```bash
   git clone git@github.com:akelani-circle/arc-p2p-payments-public.git
   cd arc-p2p-payments-public
   npm install
   ```

2. Start local Supabase (requires Docker Desktop running):

   ```bash
   npx supabase start
   npx supabase migration up
   ```

   The output of `npx supabase start` displays the Supabase URL and API keys needed in the next step.

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` and fill in all required values (see [Environment Variables](#environment-variables) section below).

4. Start the development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`.

## How It Works

- Built with [Next.js](https://nextjs.org/) App Router and [Supabase](https://supabase.com/)
- Uses [Circle Modular Wallets](https://developers.circle.com/wallets/modular) for managing transactions with Passkey security
- Payments are sent as user operations through a bundler, with gas sponsored by a paymaster
- Uses [Arc Network](https://arc.network/) for fast and low-cost transactions
- **Fund Wallet** uses `@crcl-main/onramp-kit`. The server mints a session (`/api/onramp/session`) for the signed-in user's own wallet, and the browser opens Circle's onramp widget with it
- Real-time UI updates powered by Supabase Realtime subscriptions
- Styled with [Tailwind CSS](https://tailwindcss.com) and components from [shadcn/ui](https://ui.shadcn.com/)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
# Deployment URL (optional)
NEXT_PUBLIC_VERCEL_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-local-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-local-publishable-key
SUPABASE_SECRET_KEY=your-local-secret-key

# Circle
CIRCLE_API_KEY=your-circle-api-key
CIRCLE_ENTITY_SECRET=your-circle-entity-secret
NEXT_PUBLIC_CIRCLE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl
NEXT_PUBLIC_CIRCLE_CLIENT_KEY=your-circle-client-key

# Fund Wallet (Onramp Kit, sandbox)
ONRAMP_API_BASE_URL=https://api-test.circle.com
NEXT_PUBLIC_ONRAMP_WIDGET_BASE_URL=https://onramp-sandbox.arc.io
# NEXT_PUBLIC_ONRAMP_POPUP=1
```

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_VERCEL_URL` | Public | Optional. Public origin of the deployment, used for server-side redirects and calls between routes. If unset, the origin is read from the request. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Local Supabase URL, from `npm run db:status`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Local Supabase publishable key, from `npm run db:status`. |
| `SUPABASE_SECRET_KEY` | Server-side | Local Supabase secret key, from `npm run db:status`. Bypasses row level security, so it is only used by server routes with no user session, like the Circle webhook. |
| `CIRCLE_API_KEY` | Server-side | Circle API key for wallet operations and Fund Wallet. A key works in one environment only, so it must match the onramp base URLs below. |
| `CIRCLE_ENTITY_SECRET` | Server-side | Circle entity secret for signing transactions. |
| `NEXT_PUBLIC_CIRCLE_CLIENT_URL` | Public | Circle modular wallet SDK RPC URL. |
| `NEXT_PUBLIC_CIRCLE_CLIENT_KEY` | Public | Circle client key for modular wallets. |
| `ONRAMP_API_BASE_URL` | Server-side | Circle API endpoint for the onramp. `https://api-test.circle.com` for sandbox. Unset means production. |
| `NEXT_PUBLIC_ONRAMP_WIDGET_BASE_URL` | Public | Onramp widget origin. `https://onramp-sandbox.arc.io` for sandbox. Unset means production. |
| `NEXT_PUBLIC_ONRAMP_POPUP` | Public | Optional. Set to `1` to open the onramp in a popup instead of over the phone screen. Production always uses the popup. Read at build time. |

## User Accounts

### Test Accounts

Pre-defined phone numbers and OTPs for testing, configured in `supabase/config.toml`:

| Phone Number | OTP |
| --- | --- |
| `+14152127777` | `123456` |
| `+14152128888` | `654321` |

## Available Scripts

- `npm run dev` — Start the Next.js development server
- `npm run build` — Create a production build
- `npm run start` — Start the production server
- `npm run lint` — Run ESLint
- `npm run supabase` — Run the Supabase CLI (e.g. `npm run supabase -- status`)
- `npm run db:start` — Start local Supabase
- `npm run db:stop` — Stop local Supabase
- `npm run db:status` — Show local Supabase URLs and keys
- `npm run db:reset` — Reset the local database and re-run migrations
- `npm run db:migration` — Create a new migration (e.g. `npm run db:migration -- add_column`)

## Security & Usage Model

This sample application:
- Assumes testnet usage only
- Handles secrets via environment variables
- Is not intended for production use without modification
