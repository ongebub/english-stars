import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  const { code, device_hash, device_label } = await request.json();

  if (!code || !device_hash) {
    return NextResponse.json({ error: "Missing code or device_hash" }, { status: 400 });
  }

  // Get the authenticated user
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Look up the verification code
  const { data: record } = await supabase
    .from("verification_codes")
    .select("*")
    .eq("user_id", user.id)
    .eq("code", code)
    .eq("device_hash", device_hash)
    .eq("used", false)
    .single();

  if (!record) {
    return NextResponse.json(
      { verified: false, error: "Invalid code. Please try again.\nรหัสไม่ถูกต้อง กรุณาลองใหม่" },
      { status: 400 }
    );
  }

  // Check expiry
  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.json(
      { verified: false, error: "Code expired. Please request a new one.\nรหัสหมดอายุ กรุณาขอรหัสใหม่" },
      { status: 400 }
    );
  }

  // Mark code as used
  await supabase
    .from("verification_codes")
    .update({ used: true })
    .eq("id", record.id);

  // Register trusted device
  await supabase.from("trusted_devices").upsert(
    {
      user_id: user.id,
      device_hash,
      device_label: device_label || "Unknown device",
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_hash" }
  );

  // Clear the pending 2FA cookie
  const response = NextResponse.json({ verified: true });
  response.cookies.set("es_pending_2fa", "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}
