import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, event, plan, user_id } = body;

    if (!session_id || !event) {
      return NextResponse.json({ error: "Missing session_id or event" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("signup_events").insert({
      session_id,
      user_id: user_id ?? null,
      event,
      plan: plan ?? null,
    });

    if (error) {
      console.error("Failed to insert signup_event:", error);
      return NextResponse.json({ error: "Failed to track" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track route error:", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
