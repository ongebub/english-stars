import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProgressIdServer } from "@/lib/progress-id.server";
import { adminClient, guardedAttempt, PIN_RE, getPinRow, verifyPinHash } from "@/lib/parent-pin";

export const dynamic = "force-dynamic";

/**
 * POST { mode: 'game' | 'tutor', pin }: flip the mode for the active child (or the
 * login itself when no child is active). The PIN is verified here, on the server,
 * against the stored hash, with the 5-try lockout. The write uses the service role
 * because a database trigger stops browsers changing profiles.learn_mode directly.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let body: { mode?: unknown; pin?: unknown } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.mode !== "game" && body.mode !== "tutor") return NextResponse.json({ error: "bad_mode" }, { status: 400 });
  if (typeof body.pin !== "string" || !PIN_RE.test(body.pin)) return NextResponse.json({ error: "pin_format" }, { status: 400 });
  const pin = body.pin;

  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "pin_unavailable" }, { status: 503 });

  const res = await guardedAttempt(admin, user.id, async () => {
    const { row } = await getPinRow(admin, user.id);
    return !!row && verifyPinHash(pin, row.pin_hash);
  });
  if (!res.ok) return NextResponse.json({ error: res.error, remaining: res.remaining, retryAfterSec: res.retryAfterSec }, { status: res.status });

  // Whose mode? The active child, only if it really is this login's child (progress-id rule).
  const progressId = await getProgressIdServer(supabase, user.id);
  const { error } = await admin.from("profiles").update({ learn_mode: body.mode }).eq("id", progressId);
  if (error) return NextResponse.json({ error: "mode_unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true, mode: body.mode });
}
