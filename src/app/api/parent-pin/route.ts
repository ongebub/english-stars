import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPinRow, hasRealPin, pinAdmin, pinIsStale, PIN_RE, setPinWithPassword } from "@/lib/parent-pin";

export const dynamic = "force-dynamic";

/** GET: does this parent have a PIN, and are they locked out? (never returns the hash) */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = pinAdmin();
  if (!admin) return NextResponse.json({ available: false });
  const { row, error } = await getPinRow(admin, user.id);
  if (error) return NextResponse.json({ available: false });
  const lockedMs = row?.locked_until ? new Date(row.locked_until).getTime() - Date.now() : 0;
  return NextResponse.json({
    available: true, hasPin: hasRealPin(row), needsReset: !!row && hasRealPin(row) && pinIsStale(row.pin_hash),
    lockedForSec: lockedMs > 0 ? Math.ceil(lockedMs / 1000) : 0,
  });
}

/**
 * POST { password, pin, confirm }: first-time PIN. Requires the account password, so a
 * child on a logged-in device cannot set their own PIN. An existing PIN can only change
 * via /reset.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let body: { password?: unknown; pin?: unknown; confirm?: unknown } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (typeof body.password !== "string" || !body.password) return NextResponse.json({ error: "password_required" }, { status: 400 });
  if (typeof body.pin !== "string" || !PIN_RE.test(body.pin)) return NextResponse.json({ error: "pin_format" }, { status: 400 });
  if (body.pin !== body.confirm) return NextResponse.json({ error: "pin_mismatch" }, { status: 400 });

  const admin = pinAdmin();
  if (!admin) return NextResponse.json({ error: "pin_unavailable" }, { status: 503 });
  const { row, error } = await getPinRow(admin, user.id);
  if (error) return NextResponse.json({ error: "pin_unavailable" }, { status: 503 });
  if (hasRealPin(row)) return NextResponse.json({ error: "pin_exists" }, { status: 409 });

  const res = await setPinWithPassword(admin, user, body.password, body.pin);
  if (!res.ok) return NextResponse.json({ error: res.error, remaining: res.remaining, retryAfterSec: res.retryAfterSec }, { status: res.status });
  return NextResponse.json({ ok: true }, { status: 201 });
}
