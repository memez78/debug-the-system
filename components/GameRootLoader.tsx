"use client";

import dynamic from "next/dynamic";

// `ssr: false` is only allowed inside a Client Component, hence this thin
// wrapper around the actual game (see GameRoot.tsx for why it's client-only).
const GameRoot = dynamic(() => import("./GameRoot"), { ssr: false });

export default function GameRootLoader() {
  return <GameRoot />;
}
