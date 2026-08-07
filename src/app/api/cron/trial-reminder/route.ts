import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTrialReminderEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000); // 1.5 days from now
  const windowEnd = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000);   // 2.5 days from now

  // Find trialing subscriptions whose trial ends in the 1.5–2.5 day window
  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("user_id, trial_end, tier")
    .eq("status", "trialing")
    .gte("trial_end", windowStart.toISOString())
    .lte("trial_end", windowEnd.toISOString());

  if (subsError) {
    console.error("Failed to query trialing subscriptions:", subsError);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscriptions in window" });
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subs) {
    const userId = sub.user_id;

    // Idempotency: check if reminder already sent
    const { data: existing } = await supabase
      .from("email_log")
      .select("id")
      .eq("user_id", userId)
      .eq("email_type", "trial_reminder")
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) {
      console.warn(`No email found for user ${userId}`);
      continue;
    }

    // Get progress: count distinct subjects from quiz_attempts + count trophies
    const [attemptsRes, trophiesRes] = await Promise.all([
      supabase
        .from("quiz_attempts")
        .select("subject_id")
        .eq("user_id", userId),
      supabase
        .from("trophies")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    const subjectSet = new Set((attemptsRes.data ?? []).map((r: { subject_id: string }) => r.subject_id));
    const progress = {
      subjects: subjectSet.size,
      trophies: trophiesRes.count ?? 0,
    };

    // Format charge date
    const chargeDate = sub.trial_end
      ? new Date(sub.trial_end).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

    const chargeAmount = "750 บาท";

    try {
      await sendTrialReminderEmail(
        email,
        chargeDate,
        chargeAmount,
        progress.subjects > 0 || progress.trophies > 0 ? progress : undefined
      );

      // Log success (unique constraint prevents duplicates)
      await supabase.from("email_log").insert({
        user_id: userId,
        email_type: "trial_reminder",
      });

      sent++;
    } catch (err) {
      console.error(`Failed to send trial reminder to ${email}:`, err);
    }
  }

  // ── Purge step: hard-delete profiles soft-deleted more than 12 months ago ──

  // Find profiles to purge
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profilesToPurge, error: purgeQueryErr } = await supabase
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", twelveMonthsAgo);

  if (purgeQueryErr) {
    console.error("Purge query failed:", purgeQueryErr);
    return NextResponse.json({ sent, skipped, total: subs.length, purge_error: purgeQueryErr.message });
  }

  const purgeIds = (profilesToPurge ?? []).map((p: { id: string }) => p.id);
  let purged = 0;

  if (purgeIds.length > 0) {
    // Delete related data first
    await Promise.all([
      supabase.from("quiz_attempts").delete().in("child_id", purgeIds),
      supabase.from("trophies").delete().in("child_id", purgeIds),
      supabase.from("ebook_progress").delete().in("child_id", purgeIds),
    ]);

    // Hard-delete the profiles themselves
    const { error: purgeErr } = await supabase
      .from("profiles")
      .delete()
      .in("id", purgeIds);

    if (purgeErr) {
      console.error("Purge delete failed:", purgeErr);
    } else {
      purged = purgeIds.length;
      console.log(`Purged ${purged} profile(s):`, purgeIds);
    }
  }

  return NextResponse.json({ sent, skipped, total: subs.length, purged, purge_ids: purgeIds });
}
