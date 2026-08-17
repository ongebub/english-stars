import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { sendPrintableEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * Worksheet request from /interview.
 *
 * This endpoint is PUBLIC and UNAUTHENTICATED by necessity — the whole premise
 * of the page is that nothing is demanded of the visitor. That makes it the
 * most exposed write path on the site, so it is deliberately narrow:
 *
 *   - it accepts exactly two fields, and ignores anything else in the body
 *   - it writes to ONE table, with the service role, never with a client key
 *   - it can only ever send ONE file, to the address in the request body, so it
 *     cannot be turned into an open relay for arbitrary content
 *   - repeat requests for the same address are capped, so it cannot be used to
 *     mail-bomb a third party by submitting their address in a loop
 *   - it never reveals whether an address is already on the list
 *
 * printable_requests has RLS enabled with zero policies and no anon grants, so
 * this route is the only way in. See the migration for the reasoning.
 */

const PDF_OBJECT = "interview-20-questions.pdf";
const BUCKET = "printables";

/** Max sends per address. Enough for a lost email, not enough to be a weapon. */
const MAX_SENDS = 3;
/** And no more than one send per address per this many minutes. */
const COOLDOWN_MINUTES = 5;

/* ── Caller limits (security review finding H1) ──────────────────────────────
   MAX_SENDS above is PER ADDRESS, which does nothing against the actual attack:
   feeding the endpoint a list of OTHER people's addresses. Each new address is
   a fresh row, so nothing throttled it and the route became a way to send mail
   from englishallstars.com to arbitrary strangers.

   These caps are enforced against the database rather than in memory, because
   this runs on serverless instances that neither share memory nor persist it —
   an in-process counter would reset constantly and cap nothing. */
const MAX_PER_IP_PER_HOUR = 3;
const MAX_PER_IP_PER_DAY = 10;
/** Backstop against a distributed flood: protects the Resend quota outright. */
const MAX_GLOBAL_PER_DAY = 300;

/** Longest a response may appear to take. See padTiming(). */
const TIMING_FLOOR_MS = 1200;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function siteOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

/**
 * Salted hash of the caller's address. Never store or log the raw IP — this is
 * abuse prevention, not analytics.
 *
 * The salt falls back to the service-role key, which is server-only and always
 * present; RATE_LIMIT_SALT lets it be rotated independently without redeploying
 * credentials. Without a salt the hash of an IPv4 address is trivially
 * brute-forced — the whole space is 2^32.
 */
function hashIp(req: NextRequest): string {
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`${salt}:${callerIp(req)}`).digest("hex").slice(0, 32);
}

/**
 * The caller's address, from the most trustworthy header available.
 *
 * TRUST BOUNDARY — the entire rate limiter rests on this function.
 *
 * `x-forwarded-for` is just a request header. Anyone can set it, and the
 * security review proved it: rotating it defeated the per-caller cap 8 times out
 * of 8 against `next start`, reproducing the original attack with one extra
 * line. It is safe ONLY because Vercel overwrites it at the edge and refuses to
 * forward a client-supplied value.
 *
 * That is a platform guarantee, not a property of this code, so it is asserted
 * here rather than assumed silently. `x-vercel-forwarded-for` is set by Vercel's
 * proxy and cannot be spoofed by a client (Vercel strips inbound `x-vercel-*`),
 * so it is preferred where present. If this ever runs somewhere else —
 * self-hosted, Docker, behind a different CDN — `x-forwarded-for` becomes
 * attacker-controlled again and the caps evaporate with no error and no log.
 * Whoever moves it off Vercel must revisit this function first.
 */
function callerIp(req: NextRequest): string {
  // Gated on VERCEL, not merely commented. `x-vercel-forwarded-for` is only
  // trustworthy because Vercel's edge strips inbound `x-vercel-*` headers. Off
  // Vercel nothing strips it, so preferring it would make the deployment
  // strictly WORSE than not reading it at all: behind nginx or Cloudflare — both
  // of which set `x-real-ip` correctly — an attacker's forged
  // `x-vercel-forwarded-for` would beat the proxy's genuine value. The security
  // review demonstrated exactly that. A comment telling a future maintainer to
  // revisit this is a weaker control than a branch that is simply inert.
  if (process.env.VERCEL) {
    const vercel = req.headers.get("x-vercel-forwarded-for");
    if (vercel) return vercel.split(",")[0].trim();
  }

  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();

  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || "unknown";
}

/**
 * Equalises response time (security review finding M1).
 *
 * The route answers 200 whatever happens, so that it cannot be used to test
 * whether an address is already on the list. Timing gave that away anyway: a
 * known address short-circuits in ~0.14s while a new one downloads the PDF and
 * calls Resend, taking ~0.86s. Six times apart is trivially measurable.
 *
 * Holding every response to the same floor narrows that gap. It does NOT close
 * it, and the residual is measured, not theoretical: a real accepted send was
 * observed at 1.41s against this 1200ms floor, while padded short-circuits land
 * at ~1.21s. So for a caller who is under their quota, an address that genuinely
 * sends is still distinguishable from one already on the list.
 *
 * The floor is deliberately NOT raised past that. The real defence against
 * enumeration is the per-caller cap: at three new addresses per hour per IP,
 * walking a list of any useful size is impractical regardless of timing, and
 * that cap is checked before this padding is ever reached. Raising the floor to
 * cover p99 send latency would slow every genuine visitor on a Thai mobile
 * connection to buy very little on top of that.
 *
 * Moving the send off the request path into a queue would remove the channel
 * outright and is the right fix if this endpoint ever carries more than a
 * marketing worksheet.
 */
async function padTiming(startedAt: number): Promise<void> {
  const remaining = TIMING_FLOOR_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  // CSRF-ish hardening. There is no session to ride here, so this is not a
  // classic CSRF target, but rejecting mismatched Origins still keeps other
  // sites from wiring their own forms to this endpoint. Missing Origin is
  // allowed: non-browser clients omit it and the endpoint is public anyway.
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== req.headers.get("host")) {
      return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
    }
  }

  // Bound the body before parsing it. Vercel caps request size at ~4.5MB, but
  // that is the platform's guarantee and not ours — a self-hosted deploy would
  // happily buffer whatever arrives. Two fields of text need nothing like this.
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > 4096) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, locale } = (body ?? {}) as Record<string, unknown>;

  if (typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const address = email.trim();

  // Same shape as the CHECK constraint on the table, plus a length bound so a
  // megabyte-long "address" never reaches Postgres or Resend.
  if (address.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const lang: "th" | "en" = locale === "en" ? "en" : "th";

  // Every exit below this point answers 200 and is padded to the same duration,
  // so neither the status nor the latency reveals anything about the address.
  const ok = async () => {
    await padTiming(startedAt);
    return NextResponse.json({ ok: true });
  };

  // Failures are padded too. The M2 fix made a refused Resend send return 500,
  // and an UNPADDED 500 is its own oracle: it returns fast and tells the caller
  // that Resend rejected that specific address, i.e. that it is on a
  // suppression or hard-bounce list. The status stays honest — a parent who
  // gets nothing must not be told "check your inbox" — but the timing does not
  // add to what the status already reveals.
  const fail = async (message: string, status: number) => {
    await padTiming(startedAt);
    return NextResponse.json({ error: message }, { status });
  };

  try {
    const supabase = getSupabase();

    // The unique index is on lower(email), so store the lowercased form and
    // look it up the same way. Everything that writes this table goes through
    // here, which is what keeps the two in step.
    const normalised = address.toLowerCase();

    // ── 1. Anti-abuse, per CALLER and globally. FIRST, before the address is
    //       even looked up.
    //
    // Two ordering constraints, both learned the hard way, so do not move this:
    //
    // (a) It must not sit inside an `if (!existing)` branch. It originally did,
    //     on the reasoning that only NEW addresses can be used to mail a
    //     stranger. The security review disproved that: a throttled caller could
    //     still drive sends by resubmitting addresses ALREADY on the list —
    //     three per address, consulting neither cap. Across N known addresses
    //     that is 3N uncapped emails.
    //
    // (b) It must run BEFORE the per-address lookup. When it ran after, a capped
    //     caller got a fast rejection for an unknown address but a padded 1.2s
    //     response for one already on the list — handing back exactly the
    //     membership oracle padTiming() exists to prevent, to an attacker who
    //     only had to get themselves capped first. Deciding on the caller alone,
    //     before touching the address, means a capped caller learns nothing.
    //
    // Rejecting here also sheds load before any address query runs.
    const ipHash = hashIp(req);
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

    const [{ count: perHour }, { count: perDay }, { count: globalDay }] = await Promise.all([
      supabase
        .from("printable_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", hourAgo),
      supabase
        .from("printable_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", dayAgo),
      supabase
        .from("printable_requests")
        .select("id", { count: "exact", head: true })
        .gte("last_sent_at", dayAgo),
    ]);

    if ((perHour ?? 0) >= MAX_PER_IP_PER_HOUR || (perDay ?? 0) >= MAX_PER_IP_PER_DAY) {
      // Deliberately NOT padded. padTiming() exists to hide whether a given
      // ADDRESS is on the list; this decision is about the CALLER's own quota,
      // which they can already infer. Padding it would only make abusive
      // requests expensive to refuse — holding a serverless slot for 1.2s per
      // rejection is exactly the load an attacker wants us to take.
      console.warn(`printable: caller rate limit hit (${perHour}/h, ${perDay}/d)`);
      return NextResponse.json({ ok: true });
    }

    if ((globalDay ?? 0) >= MAX_GLOBAL_PER_DAY) {
      // Loud, because reaching this means either real success worth capacity
      // planning, or an attack the per-caller caps did not contain.
      console.error(
        `printable: GLOBAL daily send ceiling reached (${globalDay}). Sending suspended.`
      );
      // 503, not a cheerful 200. Claiming success here would tell a real parent
      // to go and check an inbox that will never receive anything.
      return NextResponse.json({ error: "Temporarily unavailable" }, { status: 503 });
    }

    const COLS = "id, send_count, last_sent_at, unsubscribe_token, unsubscribed_at";

    // ── 2. Now, and only now, look the address up. Everything from here on is
    //       padded to a constant duration, because it depends on whether this
    //       particular address is already on the list.
    const { data: existing, error: readErr } = await supabase
      .from("printable_requests")
      .select(COLS)
      .eq("email", normalised)
      .maybeSingle();

    if (readErr) {
      console.error("printable_requests read failed:", readErr);
      return fail("Could not send", 500);
    }

    // Anti-abuse, per address. Always answer 200 regardless, so this endpoint
    // cannot be used to test whether an address is already on the list.
    if (existing) {
      if (existing.unsubscribed_at) return ok();
      if (existing.send_count >= MAX_SENDS) return ok();
      if (
        existing.last_sent_at &&
        Date.now() - new Date(existing.last_sent_at).getTime() < COOLDOWN_MINUTES * 60_000
      ) {
        return ok();
      }
    }

    let row = existing;
    if (!row) {
      const { data: inserted, error: insertErr } = await supabase
        .from("printable_requests")
        .insert({ email: normalised, locale: lang, source: "interview", ip_hash: hashIp(req) })
        .select(COLS)
        .single();

      if (insertErr) {
        // 23505 = unique_violation. Two requests for the same new address can
        // both read "no row" and then both insert; one loses the race on the
        // lower(email) unique index. That is a normal outcome, not an error —
        // re-read the winner's row and carry on, rather than showing a parent a
        // failure for something that actually succeeded.
        if (insertErr.code === "23505") {
          const { data: raced } = await supabase
            .from("printable_requests")
            .select(COLS)
            .eq("email", normalised)
            .maybeSingle();
          if (raced) {
            // The winning request is sending right now; do not send twice.
            return ok();
          }
        }
        console.error("printable_requests insert failed:", insertErr);
        return fail("Could not send", 500);
      }
      if (!inserted) {
        console.error("printable_requests insert returned no row");
        return fail("Could not send", 500);
      }
      row = inserted;
    }

    // The PDF lives in storage rather than the deployment bundle, so it can be
    // regenerated and re-uploaded without a redeploy.
    const { data: file, error: downloadErr } = await supabase.storage
      .from(BUCKET)
      .download(PDF_OBJECT);

    if (downloadErr || !file) {
      console.error("printable PDF download failed:", downloadErr);
      return fail("Could not send", 500);
    }
    const pdf = Buffer.from(await file.arrayBuffer());

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(PDF_OBJECT);

    await sendPrintableEmail(normalised, {
      pdf,
      downloadUrl: publicUrl,
      unsubscribeUrl: `${siteOrigin(req)}/api/interview/unsubscribe?token=${row.unsubscribe_token}`,
      locale: lang,
    });

    // Only counted once the send actually succeeded — a failed send must not
    // burn the visitor's allowance.
    const { error: updateErr } = await supabase
      .from("printable_requests")
      .update({ send_count: row.send_count + 1, last_sent_at: new Date().toISOString() })
      .eq("id", row.id);

    if (updateErr) {
      // The parent has their worksheet; failing the request now would be worse
      // than an inaccurate counter. Logged so it is visible.
      console.error("printable_requests counter update failed:", updateErr);
    }

    return ok();
  } catch (err) {
    console.error("printable request threw:", err);
    return fail("Could not send", 500);
  }
}
