import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  const { session_id } = await request.json();

  if (!session_id) {
    return NextResponse.json({ active: false, kicked: true });
  }

  const { data, error } = await supabase
    .from("child_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session_id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ active: false, kicked: true });
  }

  return NextResponse.json({ active: true });
}
