import { NextRequest, NextResponse } from "next/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { adminClient, guardedAttempt, hashPin, PIN_RE } from "@/lib/parent-pin";

export const dynamic = "force-dynamic";

/**
 * POST { password, pin, confirm }: "Forgot PIN". Proves the account password, then
 * sets a new PIN. Wrong passwords count against the same 5-try / 5-minute lockout.
 * The password is checked with a throwaway sign-in on a separate client, so the
 * caller's session is untouched.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let body: { password?: unknown; pin?: unknown; confirm?: unknown } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (typeof body.password !== "string" || !body.password) return NextResponse.json({ error: "password_required" }, { status: 400 });
  if (typeof body.pin !== "string" || !PIN_RE.test(body.pin)) return NextResponse.json({ error: "pin_format" }, { status: 400 });
  if (body.pin !== body.confirm) return NextResponse.json({ error: "pin_mismatch" }, { status: 400 });

  const admin = adminClient();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!admin || !url || !anon) return NextResponse.json({ error: "pin_unavailable" }, { status: 503 });

  const email = user.email, password = body.password;
  const res = await guardedAttempt(admin, user.id, async () => {
    const probe = createAnonClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await probe.auth.signInWithPassword({ email, password });
    return !error;
  });
  if (!res.ok) {
    const error = res.error === "wrong_pin" ? "wrong_password" : res.error;
    return NextResponse.json({ error, remaining: res.remaining, retryAfterSec: res.retryAfterSec }, { status: res.status });
  }
  const { error } = await admin.from("parent_pins").update({
    pin_hash: hashPin(body.pin), failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "pin_unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
