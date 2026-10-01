import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createAnonClient } from "@supabase/supabase-js";

/**
 * Parent PIN: 4 digits, needed to flip Game/Tutor. It is a UX nudge that keeps
 * children on track, not an access boundary: the account password is.
 *
 * Storage: public.parent_pins, service-role only (RLS on, no policies, privileges
 * revoked). Only a salted, peppered scrypt hash is kept, tagged `v1$<pepperId>$...`.
 * Four digits is a tiny space, so the pepper (PIN_PEPPER, a server secret that is never
 * in the database) is what stops an offline guess if the table leaks. PIN_PEPPER is
 * REQUIRED: with it unset every PIN route answers 503 instead of weakening the hash.
 * Rotating the pepper (change PIN_PEPPER_ID too) makes old hashes report "needs reset"
 * rather than "wrong PIN".
 *
 * Attempts are charged and locked by SQL functions (parent_pin_charge / _success), so
 * the counter is atomic, and lockouts escalate (5 min, 15 min, 1 h, 24 h).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Admin = SupabaseClient<any, any, any>;

export const MAX_ATTEMPTS = 5;
export const PIN_RE = /^\d{4}$/;
/** pin_hash value for a row created only to track password attempts before a PIN exists. */
export const UNSET = "!";

const PEPPER_ID = process.env.PIN_PEPPER_ID || "p1";

/** True only when the server secret exists. Logs (never the value) when it does not. */
export function pepperReady(): boolean {
  if (process.env.PIN_PEPPER) return true;
  console.error("[parent-pin] PIN_PEPPER is not set: PIN features are disabled (503). Set it in the Vercel environment.");
  return false;
}

export function adminClient(): Admin | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

/** Admin client, but only when the pepper is configured. Routes answer 503 on null. */
export function pinAdmin(): Admin | null {
  return pepperReady() ? adminClient() : null;
}

function derive(pin: string, salt: Buffer): Buffer {
  const keyed = createHmac("sha256", process.env.PIN_PEPPER ?? "").update(pin).digest();
  return scryptSync(keyed, salt, 32);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  return `v1$${PEPPER_ID}$${salt.toString("base64")}$${derive(pin, salt).toString("base64")}`;
}

/** "stale" = hashed under a different pepper id: the PIN must be reset, it is not simply wrong. */
export function verifyPinHash(pin: string, stored: string): "ok" | "wrong" | "stale" {
  const [v, pid, s, h] = stored.split("$");
  if (v !== "v1" || !pid || !s || !h) return "wrong";
  if (pid !== PEPPER_ID) return "stale";
  const want = Buffer.from(h, "base64");
  const got = derive(pin, Buffer.from(s, "base64"));
  return want.length === got.length && timingSafeEqual(want, got) ? "ok" : "wrong";
}
export function pinIsStale(stored: string): boolean {
  const [v, pid] = stored.split("$");
  return v === "v1" && !!pid && pid !== PEPPER_ID;
}

export interface PinRow { pin_hash: string; locked_until: string | null }

export async function getPinRow(admin: Admin, userId: string): Promise<{ row: PinRow | null; error: boolean }> {
  const { data, error } = await admin.from("parent_pins")
    .select("pin_hash, locked_until").eq("user_id", userId).maybeSingle();
  if (error) return { row: null, error: true }; // table missing (migration not applied) or unreachable
  return { row: (data as PinRow | null) ?? null, error: false };
}
export const hasRealPin = (row: PinRow | null) => !!row && row.pin_hash !== UNSET;

export type Attempt =
  | { ok: true }
  | { ok: false; status: 401 | 409 | 429 | 503; error: string; remaining?: number; retryAfterSec?: number };

/**
 * One guess. The attempt is charged atomically in SQL BEFORE `check` runs, and the
 * 5th wrong guess has already set the (escalating) lockout in the same statement.
 * `check` is the actual test (PIN hash compare, or account-password sign-in).
 * `allowUnset` lets the set/reset flows run on a row that only tracks attempts.
 */
export async function guardedAttempt(admin: Admin, userId: string, check: () => Promise<boolean>, allowUnset = false): Promise<Attempt> {
  const { data, error } = await admin.rpc("parent_pin_charge", { p_user: userId });
  if (error) return { ok: false, status: 503, error: "pin_unavailable" };
  const rows = (data ?? []) as { failed_attempts: number; locked_until: string | null }[];
  if (rows.length === 0) {
    const { row, error: rerr } = await getPinRow(admin, userId);
    if (rerr) return { ok: false, status: 503, error: "pin_unavailable" };
    if (!row) return { ok: false, status: 409, error: "no_pin" };
    const lockedMs = row.locked_until ? new Date(row.locked_until).getTime() - Date.now() : 0;
    return { ok: false, status: 429, error: "locked", retryAfterSec: Math.max(1, Math.ceil(lockedMs / 1000)) };
  }
  if (!allowUnset) {
    const { row } = await getPinRow(admin, userId);
    if (!hasRealPin(row)) return { ok: false, status: 409, error: "no_pin" };
  }
  if (await check()) {
    await admin.rpc("parent_pin_success", { p_user: userId });
    return { ok: true };
  }
  const lockedUntil = rows[0].locked_until;
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    return { ok: false, status: 429, error: "locked", retryAfterSec: Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000) };
  }
  return { ok: false, status: 401, error: "wrong_pin", remaining: Math.max(0, MAX_ATTEMPTS - rows[0].failed_attempts) };
}

/**
 * Create or replace the PIN, proving the ACCOUNT PASSWORD first. Used for the very
 * first PIN and for "Forgot PIN". Guesses at the password share the PIN lockout.
 * The throwaway sign-in uses its own client and is signed out (this session only) after.
 */
export async function setPinWithPassword(
  admin: Admin, user: { id: string; email?: string | null }, password: string, pin: string
): Promise<Attempt> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !user.email) return { ok: false, status: 503, error: "pin_unavailable" };
  // Make sure a row exists so attempts can be charged and locked before any PIN is set.
  const seed = await admin.from("parent_pins").upsert({ user_id: user.id, pin_hash: UNSET }, { onConflict: "user_id", ignoreDuplicates: true });
  if (seed.error) return { ok: false, status: 503, error: "pin_unavailable" };
  const email = user.email;
  const res = await guardedAttempt(admin, user.id, async () => {
    const probe = createAnonClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await probe.auth.signInWithPassword({ email, password });
    if (!error) await probe.auth.signOut({ scope: "local" }).catch(() => {});
    return !error;
  }, true);
  if (!res.ok) return res.error === "wrong_pin" ? { ...res, error: "wrong_password" } : res;
  const { error } = await admin.from("parent_pins").update({ pin_hash: hashPin(pin), updated_at: new Date().toISOString() }).eq("user_id", user.id);
  return error ? { ok: false, status: 503, error: "pin_unavailable" } : { ok: true };
}
