import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Parent PIN: 4 digits, set once, needed to flip Game/Tutor.
 *
 * Storage: public.parent_pins, service-role only (RLS on, no policies, privileges
 * revoked). Only a salted, peppered scrypt hash is kept. Four digits is a tiny space,
 * so the pepper (a server secret that is never in the database) is what stops an
 * offline guess if the table ever leaks, and the lockout stops online guessing.
 * Verification happens only in server routes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Admin = SupabaseClient<any, any, any>;

export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 5 * 60 * 1000;
export const PIN_RE = /^\d{4}$/;

export function adminClient(): Admin | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

function pepper(): string {
  return process.env.PIN_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}
function derive(pin: string, salt: Buffer): Buffer {
  const keyed = createHmac("sha256", pepper()).update(pin).digest();
  return scryptSync(keyed, salt, 32);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  return `v1$${salt.toString("base64")}$${derive(pin, salt).toString("base64")}`;
}
export function verifyPinHash(pin: string, stored: string): boolean {
  const [v, s, h] = stored.split("$");
  if (v !== "v1" || !s || !h) return false;
  const want = Buffer.from(h, "base64");
  const got = derive(pin, Buffer.from(s, "base64"));
  return want.length === got.length && timingSafeEqual(want, got);
}

export interface PinRow { pin_hash: string; failed_attempts: number; locked_until: string | null }

export async function getPinRow(admin: Admin, userId: string): Promise<{ row: PinRow | null; error: boolean }> {
  const { data, error } = await admin.from("parent_pins")
    .select("pin_hash, failed_attempts, locked_until").eq("user_id", userId).maybeSingle();
  if (error) return { row: null, error: true }; // table missing (migration not applied) or unreachable
  return { row: (data as PinRow | null) ?? null, error: false };
}

export type Attempt =
  | { ok: true }
  | { ok: false; status: 401 | 409 | 429 | 503; error: string; remaining?: number; retryAfterSec?: number };

/**
 * Charge one guess BEFORE checking it, using compare-and-swap on failed_attempts so
 * parallel requests cannot all slip through on the same counter value. A correct
 * guess resets the counter; the 5th wrong guess starts a 5-minute lockout.
 * `check` is the actual test (PIN hash compare, or account-password sign-in).
 */
export async function guardedAttempt(admin: Admin, userId: string, check: () => Promise<boolean>): Promise<Attempt> {
  const { row, error } = await getPinRow(admin, userId);
  if (error) return { ok: false, status: 503, error: "pin_unavailable" };
  if (!row) return { ok: false, status: 409, error: "no_pin" };
  const lockedMs = row.locked_until ? new Date(row.locked_until).getTime() - Date.now() : 0;
  if (lockedMs > 0) return { ok: false, status: 429, error: "locked", retryAfterSec: Math.ceil(lockedMs / 1000) };

  const next = row.failed_attempts + 1;
  const { data: won } = await admin.from("parent_pins")
    .update({ failed_attempts: next, updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("failed_attempts", row.failed_attempts).select("user_id");
  if (!won || won.length === 0) return { ok: false, status: 429, error: "busy", retryAfterSec: 2 };

  if (await check()) {
    await admin.from("parent_pins").update({ failed_attempts: 0, locked_until: null }).eq("user_id", userId);
    return { ok: true };
  }
  if (next >= MAX_ATTEMPTS) {
    await admin.from("parent_pins").update({ failed_attempts: 0, locked_until: new Date(Date.now() + LOCK_MS).toISOString() }).eq("user_id", userId);
    return { ok: false, status: 429, error: "locked", retryAfterSec: Math.ceil(LOCK_MS / 1000) };
  }
  return { ok: false, status: 401, error: "wrong_pin", remaining: MAX_ATTEMPTS - next };
}
