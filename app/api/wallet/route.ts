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

import { getErrorMessage } from "@/lib/utils/utils";
import { NextRequest, NextResponse } from "next/server";
import { circleDeveloperSdk } from "@/lib/utils/developer-controlled-wallets-client";

// The network the rest of the app is pinned to: ARC_CHAIN_ID 5042002 and
// "Arc Testnet" in the webhook handler both describe Arc Testnet.
const BLOCKCHAIN = "ARC-TESTNET";

// What goes in the database. Circle reports the wallet's blockchain as
// "ARC-TESTNET", but every read in this app filters on .eq("blockchain", "ARC")
// — /api/setup-wallets writes that too — so the stored value is normalised here
// rather than leaving rows this app cannot find. Change both together.
const STORED_BLOCKCHAIN = "ARC";

export async function POST(req: NextRequest) {
  try {
    const { walletSetId } = await req.json();

    if (!walletSetId?.trim()) {
      return NextResponse.json(
        { error: "walletSetId is required" },
        { status: 400 }
      );
    }

    const response = await circleDeveloperSdk.createWallets({
      walletSetId,
      blockchains: [BLOCKCHAIN],
      accountType: "SCA",
      count: 1,
    });

    const wallet = response.data?.wallets?.[0];

    if (!wallet) {
      return NextResponse.json(
        { error: "The response did not include a valid wallet" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ...wallet, blockchain: STORED_BLOCKCHAIN },
      { status: 201 }
    );
  } catch (error) {
    console.error(`Wallet creation failed: ${getErrorMessage(error)}`);
    return NextResponse.json(
      { error: "Failed to create wallet" },
      { status: 500 }
    );
  }
}
