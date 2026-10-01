"use client";

import { createContext, useContext } from "react";

export type LearnMode = "game" | "tutor";
const Ctx = createContext<LearnMode>("tutor");

/** Mode resolved on the server for the current child (see lib/game/mode.server.ts). */
export function LearnModeProvider({ mode, children }: { mode: LearnMode; children: React.ReactNode }) {
  return <Ctx.Provider value={mode}>{children}</Ctx.Provider>;
}
export function useLearnMode(): LearnMode {
  return useContext(Ctx);
}
