import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendVerificationCode } from "@/lib/resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  const { device_hash } = await request.json();

  if (!device_hash) {
    return NextResponse.json({ error: "Missing device_hash" }, { status: 400 });
  }

  // Get the authenticated user
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if device is already trusted
  const { data: trusted } = await supabase
    .from("trusted_devices")
    .select("id")
    .eq("user_id", user.id)
    .eq("device_hash", device_hash)
    .single();

  if (trusted) {
    // Update last_used_at
    await supabase
      .from("trusted_devices")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", trusted.id);

    return NextResponse.json({ trusted: true });
  }

  // Device is not trusted — generate verification code
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Invalidate any existing unused codes for this user
  await supabase
    .from("verification_codes")
    .update({ used: true })
    .eq("user_id", user.id)
    .eq("used", false);

  // Insert new code
  await supabase.from("verification_codes").insert({
    user_id: user.id,
    code,
    device_hash,
    expires_at,
  });

  // Send email
  try {
    await sendVerificationCode(user.email!, code);
  } catch (e) {
    console.error("Failed to send verification email:", e);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }

  // Set pending 2FA cookie so middleware blocks access to protected routes
  const response = NextResponse.json({ trusted: false, requires_2fa: true });
  response.cookies.set("es_pending_2fa", "1", {
    path: "/",
    maxAge: 600, // 10 minutes
    httpOnly: false,
    sameSite: "lax",
  });

  return response;
}
