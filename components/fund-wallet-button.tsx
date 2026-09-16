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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ONRAMP_EVENT_TYPES,
  createOnrampKit,
  fetchOnrampSession,
  type OnrampEventEnvelope,
} from "@crcl-main/onramp-kit";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OnrampSheet } from "@/components/onramp-sheet";
import { useWeb3 } from "@/components/web3-provider";
import { useBalance } from "@/contexts/balanceContext";
import {
  CLIENT_ENVIRONMENT,
  ONRAMP_ASSETS,
  ONRAMP_CHAIN,
  ONRAMP_SURROUND,
  WIDGET_BASE_URL,
} from "@/lib/onramp/environment";

type OnrampSession = Awaited<ReturnType<typeof fetchOnrampSession>>;

const SESSION_URL = "/api/onramp/session";

// The widget renders inside the phone. Setting NEXT_PUBLIC_ONRAMP_POPUP to 1 or
// true opts into opening the hosted experience in a popup window instead, which
// is the escape hatch for providers whose own `frame-ancestors` refuse to be
// nested inside a host origin. It has to be read as this exact expression: Next
// inlines it at build time, so destructuring or dynamic lookup won't work, and
// `next dev` only picks up a change on restart.
const POPUP_REQUESTED = ["1", "true"].includes(
  (process.env.NEXT_PUBLIC_ONRAMP_POPUP ?? "").trim().toLowerCase(),
);

// Embedding is a sandbox-only capability. The production widget only accepts
// being framed by origins registered with Circle, so a demo served from
// localhost gets a cross-origin refusal and an empty sheet instead of the flow.
// Popup mode has no such constraint, so production always uses it — whatever
// NEXT_PUBLIC_ONRAMP_POPUP says.
const USE_POPUP = POPUP_REQUESTED || CLIENT_ENVIRONMENT === "production";

function tintSurround(session: OnrampSession): OnrampSession {
  // Bare-token sessions have no URL to rewrite; the kit composes one itself.
  if (typeof session.widgetUrl !== "string") return session;
  const url = new URL(session.widgetUrl);
  url.searchParams.set("bgcolor", ONRAMP_SURROUND);
  return { ...session, widgetUrl: url.toString() };
}

/**
 * Replaces the old faucet link. Buys USDC straight into this user's Arc wallet
 * through Circle's onramp widget, embedded over the phone screen.
 */
export function FundWalletButton() {
  const { account } = useWeb3();
  const { refreshBalances } = useBalance();
  const address = account.address;

  const [session, setSession] = useState<OnrampSession | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const kitRef = useRef<ReturnType<typeof createOnrampKit> | null>(null);
  // Lazily constructed so nothing touches `window` during SSR. The getter is
  // synchronous, which openWindow requires.
  const getKit = () =>
    (kitRef.current ??= createOnrampKit({ widgetBaseUrl: WIDGET_BASE_URL }));

  // Sessions are single-use and openWindow must run synchronously inside the
  // click handler, so one is always minted ahead of time.
  const mintSession = useCallback(async (destinationAddress: string) => {
    setSession(null);
    try {
      const fresh = await fetchOnrampSession({
        url: SESSION_URL,
        body: {
          // Opaque host identifier. The wallet address is the stable per-user
          // key available here without extra plumbing.
          userId: destinationAddress,
          destinationAddress,
          destinationChain: ONRAMP_CHAIN,
          assets: ONRAMP_ASSETS,
        },
      });
      setSession(fresh);
    } catch (error) {
      console.error("Could not create an onramp session:", error);
      toast.error("Could not start the funding flow. Try again.");
    }
  }, []);

  // Mint as soon as there is an address, and re-mint if the wallet changes.
  useEffect(() => {
    if (!address) {
      setSession(null);
      setSheetOpen(false);
      return;
    }
    void mintSession(address);
  }, [address, mintSession]);

  // Every widget event, from either transport. A finished deposit dates the
  // balance, so it is re-read here.
  const handleEvent = useCallback(
    (envelope: OnrampEventEnvelope) => {
      if (
        envelope.event !== ONRAMP_EVENT_TYPES.DEPOSIT_SUBMITTED &&
        envelope.event !== ONRAMP_EVENT_TYPES.DEPOSIT_SETTLED
      ) {
        return;
      }

      const done =
        envelope.event === ONRAMP_EVENT_TYPES.DEPOSIT_SETTLED ||
        envelope.payload.settlementExpected === false;

      if (done) {
        toast.success("Deposit settled");
        void refreshBalances();
      } else {
        toast.info("Deposit submitted");
      }
    },
    [refreshBalances],
  );

  // Embedded mode. The widget lives in a sheet over the phone screen, so it
  // goes up with the sheet and comes down with it. Nothing re-mints here: the
  // mount consumes the session, and minting on every mount would feed the
  // effect its own next session forever.
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!sheetOpen || !session || !address || !container) return;

    const widget = getKit().mountIframe({
      session: tintSurround(session),
      container,
      onAnyEvent: handleEvent,
      // Covers an expiry mid-flow and a token the widget rejects outright.
      onSessionExpired: () => mintSession(address),
    });
    return () => widget.close();
  }, [sheetOpen, session, address, mintSession, handleEvent]);

  // Closing consumes nothing further, but the mount already spent the session,
  // so the next purchase needs a fresh one.
  const closeSheet = () => {
    setSheetOpen(false);
    if (!address) return;
    void mintSession(address);
    // A deposit can settle in the seconds around the close, which produces no
    // event once the iframe is gone. Re-reading here catches that case.
    void refreshBalances();
  };

  function fundWallet() {
    if (!address || !session) return;

    if (!USE_POPUP) {
      setSheetOpen(true);
      return;
    }

    const result = getKit().openWindow({ session });

    if (result.status === "blocked") {
      toast.error(
        result.reason === "popup_blocked"
          ? "Your browser blocked the popup. Allow popups for this site and try again."
          : `Popup unavailable (${result.reason}). ${result.errorMessage ?? ""}`,
      );
    } else {
      result.widget.on("*", handleEvent);
    }

    // The session just got consumed either way, so mint the next one.
    void mintSession(address);
  }

  return (
    <>
      <Button
        className="flex-1 py-3 text-lg font-semibold rounded-full"
        onClick={fundWallet}
        disabled={!address || !session}
      >
        {!address ? "Connect a wallet" : !session ? "Preparing…" : "Fund Wallet"}
      </Button>
      {sheetOpen && (
        <OnrampSheet
          containerRef={containerRef}
          ready={Boolean(session)}
          onClose={closeSheet}
        />
      )}
    </>
  );
}
