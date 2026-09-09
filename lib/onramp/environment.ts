/**
 * Copyright 2026 Circle Internet Group, Inc.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Which Circle environment the app talks to, and the one place that decides it.
 *
 * The kit is configured by two independent URLs — the API base URL, used by the
 * server, and the widget origin, used by both halves — and falls back to its
 * production endpoints when either is unset. Everything else that has to follow
 * the environment (the sandbox notice on the funding sheet, whether the widget
 * can be embedded) is derived from those same two values rather than from a
 * third switch of its own.
 *
 * Safe to import from client components: it reads only `NEXT_PUBLIC_*`.
 */

export type OnrampEnvironment = "production" | "sandbox";

export const PRODUCTION_API_BASE_URL = "https://api.circle.com";
export const PRODUCTION_WIDGET_BASE_URL = "https://onramp.arc.io";
export const SANDBOX_API_BASE_URL = "https://api-test.circle.com";
export const SANDBOX_WIDGET_BASE_URL = "https://onramp-sandbox.arc.io";

/**
 * A variable that is unset, empty, or whitespace all mean the same thing to the
 * kit — use the built-in default — so they are collapsed to `undefined` here.
 */
export function readUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The origin of a configured URL. The widget value is written both ways in the
 * wild — bare origin, and origin plus `/launch/onramp/v1` — so the comparison
 * has to ignore the path. The kit still receives the value verbatim.
 */
function originOf(url: string, name: string): string {
  try {
    return new URL(url).origin;
  } catch {
    throw new Error(`${name} is not a valid URL: ${JSON.stringify(url)}`);
  }
}

/**
 * Production has to be named explicitly (or left unset, which is the kit's own
 * default). Anything else — sandbox, staging, a local proxy — is classified as
 * non-production, which is the safe direction to be wrong in: it keeps testnet
 * defaults away from mainnet rather than the reverse.
 */
export function resolveEnvironment(
  url: string | undefined,
  productionUrl: string,
  name: string,
): OnrampEnvironment {
  if (!url) return "production";
  return originOf(url, name) === productionUrl ? "production" : "sandbox";
}

/**
 * Read as this exact expression because Next inlines `NEXT_PUBLIC_*` at build
 * time: a dynamic lookup would come back undefined in the browser. `next dev`
 * only picks up a change on restart.
 */
export const WIDGET_BASE_URL = readUrl(process.env.NEXT_PUBLIC_ONRAMP_WIDGET_BASE_URL);

export const CLIENT_ENVIRONMENT = resolveEnvironment(
  WIDGET_BASE_URL,
  PRODUCTION_WIDGET_BASE_URL,
  "NEXT_PUBLIC_ONRAMP_WIDGET_BASE_URL",
);

/**
 * The chain the widget delivers to. This app's wallets are Arc-only — the
 * webhook handler, the balance reader and /api/wallet are all pinned to Arc —
 * so the funding flow is scoped to match. The widget resolves `arc` to Arc
 * Testnet on sandbox and Arc mainnet on production, which is the same split
 * ARC_CHAIN_ID 5042002 describes on the sandbox side.
 */
export const ONRAMP_CHAIN = "arc";

/** USDC on Arc, and nothing else. `pairs` composes with AND semantics. */
export const ONRAMP_ASSETS = {
  pairs: [{ token: "USDC", chain: ONRAMP_CHAIN }],
};

/**
 * The widget letterboxes its content against `--onramp-surround`, which its
 * launch URL exposes as a `bgcolor` hex. Pinned to the app's own surface colour
 * (`--color-background` in app/globals.css) so the seam between the host page
 * and the iframe disappears. Keep the two in step.
 */
export const ONRAMP_SURROUND = "#0d1b2f";
