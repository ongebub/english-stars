"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveChild } from "@/lib/active-child";
import { resolveProgressId } from "@/lib/progress-id";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

const cache = new Map<string, string>();

/** Browser: the profile id to write progress under (see progress-id.ts). */
export async function getProgressId(supabase: AnyClient, userId: string): Promise<string> {
  const active = getActiveChild()?.childId ?? null;
  const key = `${userId}:${active ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const id = await resolveProgressId(supabase, userId, active);
  cache.set(key, id);
  return id;
}
