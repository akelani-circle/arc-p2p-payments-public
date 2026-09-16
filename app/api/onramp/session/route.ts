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

import {
  createOnrampServerKit,
  createSessionRouteHandler,
} from "@crcl-main/onramp-kit/server";
import { API_BASE_URL, ENVIRONMENT } from "@/lib/onramp/server-environment";
import { WIDGET_BASE_URL } from "@/lib/onramp/environment";

// An API key belongs to one environment; the other rejects it. Importing
// server-environment has already refused to start if the two base URLs
// disagree, so this only has to catch the key being absent outright.
const apiKey = process.env.CIRCLE_API_KEY?.trim();
if (!apiKey) {
  throw new Error(
    `CIRCLE_API_KEY is not set. Add the ${ENVIRONMENT} API key from the Circle console.`,
  );
}

// Both URLs are passed through verbatim. Undefined leaves the kit on its own
// defaults, https://api.circle.com and https://onramp.arc.io, which is mainnet
// and moves real money.
const server = createOnrampServerKit({
  apiKey,
  baseUrl: API_BASE_URL,
  widgetBaseUrl: WIDGET_BASE_URL,
});

export const POST = createSessionRouteHandler(server);
