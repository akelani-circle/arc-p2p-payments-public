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
- [Upgrading](#upgrading)
- [Environment Variables](#environment-variables)
- [User Accounts](#user-accounts)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
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
   npm run db:start
   ```

   This starts Supabase in Docker and applies the migrations in `supabase/migrations`. The output shows the Supabase URL and API keys needed in the next step; run `npm run db:status` to see them again.

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
- **Fund Wallet** uses `@circle-fin/onramp-kit`. The server mints a session (`/api/onramp/session`) for the signed-in user's own wallet, and the browser opens Circle's onramp widget with it
- Real-time UI updates powered by Supabase Realtime subscriptions
- Styled with [Tailwind CSS](https://tailwindcss.com) and components from [shadcn/ui](https://ui.shadcn.com/)

## Upgrading

Changes that require action on an existing deployment:

- **Apply the new migration** (`npm run db:start` locally, `npm run supabase -- db push` on a hosted project). It:
  - makes a wallet address unique per chain (case-insensitively). Before this, a user could register **another user's address** as their own, and the Circle webhook, which uses the first wallet it finds for an address, would then record that person's incoming transfers against the wrong account. **If the migration fails on the unique index, two wallet rows already share an address**: find them with `select lower(wallet_address), count(*) from wallets group by 1 having count(*) > 1`, fix or remove the duplicates, and run it again;
  - stops users writing `wallets.balance`, `profiles.email` and `profiles.is_active`, and stops them editing their own `transactions` afterwards. Only server code with the secret key writes those now.
- **Four routes were removed.** `/api/manual-wallet-setup` had no authentication and used the secret key, so **anyone could overwrite any user's wallet address by email**, which redirects the payments people send them. `/api/debug-wallets` was a debug dump. `/api/wallet-set` and `/api/wallet` let anyone create wallets on your Circle account; the sign-in callback now creates the wallet directly.
- **The wallet APIs now check who is calling.** `/api/wallet/balance`, `/api/wallet/transactions`, `/api/wallet/transactions/[id]` and `/api/onramp/session` were open to anyone (the last three with the secret key or Circle key). They now require a signed-in user and only work on that user's own wallet. The onramp route also refuses a session whose destination is not your own wallet address.
- **`/api/setup-wallets` validates the address** it is given, and answers `409` if it already belongs to someone else.
- **The Circle webhook finds wallets by address.** It used to read the first 50 wallets and search those in memory, so once there were more than 50, most incoming transfers were never recorded. It also verifies the exact bytes Circle signed, and refreshes balances directly instead of calling `/api/wallet/balance` over HTTP.

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
- `npm test` — Run the unit tests (no services needed)
- `npm run test:integration` — Run database tests against the local Supabase (`npm run db:start` first)
- `npm run supabase` — Run the Supabase CLI (e.g. `npm run supabase -- status`)
- `npm run db:start` — Start local Supabase
- `npm run db:stop` — Stop local Supabase
- `npm run db:status` — Show local Supabase URLs and keys
- `npm run db:reset` — Reset the local database and re-run migrations
- `npm run db:migration` — Create a new migration (e.g. `npm run db:migration -- add_column`)

## Testing

- `npm test` runs the unit tests in `tests/unit`. They mock Supabase, Circle and the onramp kit, so they need no credentials or Docker. They cover who may call each route (signed-out, someone else's wallet, your own), wallet setup validation, and the webhook, including real signature verification.
- `npm run test:integration` runs `tests/integration` against the **local** Supabase stack: the row-level-security rules, exercised with real users and real sessions. It reads connection settings from `.env.local`, and creates and deletes its own users.

## Security & Usage Model

This sample application:
- Assumes testnet usage only
- Handles secrets via environment variables
- Checks that a signed-in user owns the wallet before any wallet API acts on it
- Is not intended for production use without modification

Known limitations to address before any production use:
- **Recipient search exposes users to each other.** Any signed-in user can list every other user's name, email and wallet address (that is how recipients are found). Production code should look recipients up by exact match on the server.
- **Display names are free text.** A user can pick the same name as someone else, so a recipient list can show two "Alice"s. Check the address before sending.
- **Passkey credentials are readable by other signed-in users** through the `wallets` table. They contain public-key material, not secrets, but production code should serve them only to their owner.
- **The onramp is only verified against a stub in this repo's tests.** The wallet-ownership check in `/api/onramp/session` sits in front of `@circle-fin/onramp-kit`'s own route handler; test it end to end with the real kit before relying on it.

See `SECURITY.md` for vulnerability reporting guidelines. Please report issues privately via Circle's bug bounty program.
