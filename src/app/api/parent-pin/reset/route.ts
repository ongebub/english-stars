import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pinAdmin, PIN_RE, setPinWithPassword } from "@/lib/parent-pin";

export const dynamic = "force-dynamic";

/** POST { password, pin, confirm }: "Forgot PIN" (or a PIN made stale by a pepper change). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let body: { password?: unknown; pin?: unknown; confirm?: unknown } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (typeof body.password !== "string" || !body.password) return NextResponse.json({ error: "password_required" }, { status: 400 });
  if (typeof body.pin !== "string" || !PIN_RE.test(body.pin)) return NextResponse.json({ error: "pin_format" }, { status: 400 });
  if (body.pin !== body.confirm) return NextResponse.json({ error: "pin_mismatch" }, { status: 400 });

  const admin = pinAdmin();
  if (!admin) return NextResponse.json({ error: "pin_unavailable" }, { status: 503 });
  const res = await setPinWithPassword(admin, user, body.password, body.pin);
  if (!res.ok) return NextResponse.json({ error: res.error, remaining: res.remaining, retryAfterSec: res.retryAfterSec }, { status: res.status });
  return NextResponse.json({ ok: true });
}
