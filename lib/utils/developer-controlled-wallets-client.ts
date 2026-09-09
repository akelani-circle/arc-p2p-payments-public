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

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

// next.config.js refuses to build without these, so they are present by the
// time anything imports this module. The check is kept so a misconfigured
// runtime fails with the missing variable named rather than with an opaque 401
// from Circle on the first call.
const { CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET } = process.env;

if (!CIRCLE_API_KEY?.trim()) {
  throw new Error("CIRCLE_API_KEY environment variable is missing or empty");
}

if (!CIRCLE_ENTITY_SECRET?.trim()) {
  throw new Error("CIRCLE_ENTITY_SECRET environment variable is missing or empty");
}

/**
 * Server-only Circle client for the developer-controlled wallet set that backs
 * the sign-in flow. The entity secret encrypts every write, so this must never
 * be reachable from the browser bundle. Neither variable is NEXT_PUBLIC_, so an
 * accidental client import inlines them as undefined and throws above rather
 * than shipping the secret.
 */
export const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
  apiKey: CIRCLE_API_KEY,
  entitySecret: CIRCLE_ENTITY_SECRET,
});
