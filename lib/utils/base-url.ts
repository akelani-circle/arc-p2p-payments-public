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

import { headers } from "next/headers";

/**
 * The origin this app is being served from, for the server-side cases that need
 * an absolute URL: redirects, and route handlers calling sibling handlers.
 *
 * Client code must not use this — a browser fetch to a sibling route should be
 * a relative path, which is same-origin by construction.
 *
 * NEXT_PUBLIC_VERCEL_URL wins when set, so a deployment can pin its public
 * origin. Otherwise the origin is read off the inbound request, which keeps a
 * dev server correct on whatever port it happens to be bound to instead of
 * assuming 3000 and failing CORS.
 */
export async function resolveBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (configured) {
    // Vercel exposes VERCEL_URL as a bare host; .env.example documents it with
    // a scheme. Accept both.
    return /^https?:\/\//.test(configured) ? configured : `https://${configured}`;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return "http://localhost:3000";

  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
