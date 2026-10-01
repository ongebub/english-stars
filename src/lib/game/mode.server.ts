import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProgressIdServer } from "@/lib/progress-id.server";
import { MAP_BAND_COOKIE } from "./context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;
export type LearnMode = "game" | "tutor";

/**
 * Which mode applies to this login + active child.
 * profiles.learn_mode (written only by the PIN-protected route) wins when set;
 * otherwise Game, unless the subscription tier is 'tutor'. If the column does not
 * exist yet (migration not applied) the lookup just yields no override.
 */
export async function getLearnMode(
  supabase: AnyClient,
  userId: string
): Promise<{ mode: LearnMode; explicit: LearnMode | null; tier: string | null; progressId: string }> {
  const progressId = await getProgressIdServer(supabase, userId);
  const [{ data: prof }, { data: sub }] = await Promise.all([
    supabase.from("profiles").select("learn_mode").eq("id", progressId).maybeSingle(),
    supabase.from("subscriptions").select("tier").eq("user_id", userId).maybeSingle(),
  ]);
  const raw = (prof as { learn_mode?: string | null } | null)?.learn_mode;
  const explicit: LearnMode | null = raw === "game" || raw === "tutor" ? raw : null;
  const tier = (sub as { tier?: string | null } | null)?.tier ?? null;
  return { mode: explicit ?? (tier === "tutor" ? "tutor" : "game"), explicit, tier, progressId };
}

export async function getMapBandServer(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(MAP_BAND_COOKIE)?.value;
  return v ? decodeURIComponent(v) : null;
}
