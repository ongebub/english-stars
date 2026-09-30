import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_CHILD_COOKIE } from "@/lib/active-child";
import { resolveProgressId } from "@/lib/progress-id";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

/** Server components: the profile id to READ progress for (see progress-id.ts). */
export async function getProgressIdServer(supabase: AnyClient, userId: string): Promise<string> {
  const store = await cookies();
  const raw = store.get(ACTIVE_CHILD_COOKIE)?.value;
  return resolveProgressId(supabase, userId, raw ? decodeURIComponent(raw) : null);
}
