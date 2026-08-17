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

  // ── NO EARLY RETURNS FROM HERE ON. READ THIS BEFORE ADDING ONE. ────────────
  //
  // This route does three unrelated jobs: send trial reminders, purge profiles
  // soft-deleted 12+ months ago, and scrub old rate-limiting IP hashes. It used
  // to `return` here whenever there were no trials in the 1.5–2.5 day window,
  // which on most days there are not — so the two MAINTENANCE jobs below almost
  // never executed.
  //
  // That was found by the security review, and it is worse than it sounds: the
  // 12-month purge is a RETENTION COMMITMENT stated in our privacy policy, and
  // on this evidence it has very likely never run since it was added in
  // 9634163. A live check at the time of the fix showed 0 trialing subscriptions
  // in the window, i.e. the cron was returning at this line that day.
  //
  // The reminder failure is likewise no longer fatal to the rest of the run: a
  // bad subscriptions query must not stop us honouring a deletion request.
  let sent = 0;
  let skipped = 0;
  let reminderError: string | null = null;

  if (subsError) {
    console.error("Failed to query trialing subscriptions:", subsError);
    reminderError = subsError.message;
  }

  for (const sub of subs ?? []) {
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

  // Was an early return. A failed purge query must not skip the ip_hash
  // retention scrub below — they are independent obligations.
  let purgeError: string | null = null;
  if (purgeQueryErr) {
    console.error("Purge query failed:", purgeQueryErr);
    purgeError = purgeQueryErr.message;
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

  // ── Retention step: drop rate-limiting IP hashes older than 30 days ────────
  //
  // printable_requests.ip_hash exists only to rate-limit the public worksheet
  // endpoint, and the longest window it is consulted over is 24 hours. A salted
  // hash is pseudonymised, not anonymised, so it stays personal data for as long
  // as we keep it — and there is no reason to keep it past its usefulness.
  //
  // This was written because the security review pointed out that the migration
  // claimed retention was handled "by the existing retention job" when no such
  // code existed. Now it does. Do not delete this without also correcting that
  // comment in 20260817200000_printable_requests_rate_limit.sql.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: scrubbed, error: scrubErr } = await supabase
    .from("printable_requests")
    .update({ ip_hash: null })
    .not("ip_hash", "is", null)
    .lt("created_at", thirtyDaysAgo)
    .select("id");

  if (scrubErr) console.error("ip_hash retention scrub failed:", scrubErr);
  const ipHashesScrubbed = scrubbed?.length ?? 0;
  if (ipHashesScrubbed > 0) console.log(`Scrubbed ip_hash from ${ipHashesScrubbed} row(s)`);

  return NextResponse.json({
    sent,
    skipped,
    total: subs?.length ?? 0,
    purged,
    purge_ids: purgeIds,
    ip_hashes_scrubbed: ipHashesScrubbed,
    // Reported rather than thrown, so a failure in one job is visible without
    // hiding whether the other two ran.
    reminder_error: reminderError,
    purge_error: purgeError,
  });
}
