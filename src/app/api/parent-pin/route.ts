import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient, getPinRow, hashPin, PIN_RE } from "@/lib/parent-pin";

export const dynamic = "force-dynamic";

/** GET: does this parent have a PIN, and are they locked out? (never returns the hash) */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = adminClient();
  if (!admin) return NextResponse.json({ available: false });
  const { row, error } = await getPinRow(admin, user.id);
  if (error) return NextResponse.json({ available: false });
  const lockedMs = row?.locked_until ? new Date(row.locked_until).getTime() - Date.now() : 0;
  return NextResponse.json({ available: true, hasPin: !!row, lockedForSec: lockedMs > 0 ? Math.ceil(lockedMs / 1000) : 0 });
}

/** POST { pin, confirm }: first-time PIN. An existing PIN can only change via /reset (account password). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let body: { pin?: unknown; confirm?: unknown } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (typeof body.pin !== "string" || !PIN_RE.test(body.pin)) return NextResponse.json({ error: "pin_format" }, { status: 400 });
  if (body.pin !== body.confirm) return NextResponse.json({ error: "pin_mismatch" }, { status: 400 });

  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "pin_unavailable" }, { status: 503 });
  const { row, error } = await getPinRow(admin, user.id);
  if (error) return NextResponse.json({ error: "pin_unavailable" }, { status: 503 });
  if (row) return NextResponse.json({ error: "pin_exists" }, { status: 409 });
  const { error: insErr } = await admin.from("parent_pins").insert({ user_id: user.id, pin_hash: hashPin(body.pin) });
  if (insErr) return NextResponse.json({ error: "pin_unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
