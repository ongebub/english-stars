#!/usr/bin/env node
/**
 * Smoke test suite — the seven paths where breakage is expensive.
 *
 *   npm run smoke                    # against production
 *   SMOKE_BASE_URL=http://localhost:3000 npm run smoke
 *
 * Deliberately small. Seven fast checks that actually run beat a large suite
 * that gets skipped.
 *
 * Exit codes: 0 = all passed (skips allowed), 1 = at least one FAIL.
 *
 * A test that cannot be run reports SKIP with a reason and does NOT pass. Read
 * the summary: a SKIP is an unverified path, not a green one. Tests needing a
 * real session are skipped unless SMOKE_EMAIL / SMOKE_PASSWORD are set.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const BASE = (process.env.SMOKE_BASE_URL || "https://www.englishallstars.com").replace(/\/+$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMOKE_EMAIL = process.env.SMOKE_EMAIL;
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD;

const results = [];
const record = (name, status, detail) => {
  results.push({ name, status, detail });
  const tag = status === "PASS" ? "  PASS" : status === "SKIP" ? "  SKIP" : "  FAIL";
  console.log(`${tag}  ${name}${detail ? `\n        ${detail}` : ""}`);
};

async function test(name, fn) {
  try {
    const detail = await fn();
    if (detail && detail.skip) record(name, "SKIP", detail.skip);
    else record(name, "PASS", detail || "");
  } catch (err) {
    record(name, "FAIL", err.message);
  }
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// Follow no redirects so we can assert on the status itself.
const raw = (path, init = {}) =>
  fetch(`${BASE}${path}`, { redirect: "manual", ...init });

// ── 1. Landing page renders logged out, in Thai ──────────────────────────────
await test("landing page: 200, Thai content, lang=th", async () => {
  const res = await raw("/");
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const html = await res.text();
  const thai = (html.match(/[฀-๿]/g) || []).length;
  assert(thai > 50, `expected Thai copy, found only ${thai} Thai characters`);
  assert(/<html[^>]+lang="th"/.test(html), 'expected <html lang="th">');
  return `200, ${thai} Thai chars, lang=th`;
});

// ── 2. Legal pages ───────────────────────────────────────────────────────────
await test("/privacy and /terms return 200", async () => {
  const [p, t] = await Promise.all([raw("/privacy"), raw("/terms")]);
  assert(p.status === 200, `/privacy expected 200, got ${p.status}`);
  assert(t.status === 200, `/terms expected 200, got ${t.status}`);
  return "/privacy 200, /terms 200";
});

// ── 3. Signup flow reaches Stripe checkout ───────────────────────────────────
// We do NOT create a real Stripe session here — that would leave junk objects in
// the live account. We assert the signup page renders and the checkout endpoint
// is wired and refuses unauthenticated callers (not 404, not 5xx).
await test("signup page renders and /api/stripe/checkout is wired", async () => {
  const page = await raw("/signup");
  assert(page.status === 200, `/signup expected 200, got ${page.status}`);
  const res = await raw("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(res.status !== 404, "/api/stripe/checkout returned 404 — route missing");
  assert(res.status < 500, `/api/stripe/checkout returned ${res.status} — server error`);
  return `/signup 200, checkout endpoint responded ${res.status} (no real session created)`;
});

// ── 4. /learn is gated, and the authenticated data path works ────────────────
await test("/learn redirects logged out", async () => {
  const res = await raw("/learn");
  assert(
    res.status === 307 || res.status === 302,
    `expected redirect, got ${res.status}`
  );
  const loc = res.headers.get("location") || "";
  assert(/\/login/.test(loc), `expected redirect to /login, got ${loc}`);
  return `${res.status} -> ${loc}`;
});

let session = null;
await test("authenticated data path for /learn (sign in + access check)", async () => {
  if (!SMOKE_EMAIL || !SMOKE_PASSWORD)
    return { skip: "SMOKE_EMAIL / SMOKE_PASSWORD not set — authenticated paths unverified" };
  if (!SUPABASE_URL || !ANON_KEY) return { skip: "Supabase URL / anon key not set" };

  const sb = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await sb.auth.signInWithPassword({
    email: SMOKE_EMAIL,
    password: SMOKE_PASSWORD,
  });
  assert(!error, `sign-in failed: ${error?.message}`);
  session = { client: sb, user: data.user };

  const { data: status, error: rpcErr } = await sb.rpc("check_access_status", {
    check_user_id: data.user.id,
  });
  assert(!rpcErr, `check_access_status failed: ${rpcErr?.message}`);

  const { error: readErr, count } = await sb
    .from("subjects")
    .select("id", { count: "exact", head: true });
  assert(!readErr, `subjects read failed: ${readErr?.message}`);

  // NOTE: this proves the data path, not that the page rendered. Page rendering
  // needs a real browser cookie session and is not covered here.
  return `signed in, access_status=${status}, ${count} subjects readable`;
});

// ── 5. A child profile can be created and read back ──────────────────────────
await test("child profile can be created and read back", async () => {
  if (!SUPABASE_URL || !SERVICE_KEY)
    return { skip: "SUPABASE_SERVICE_ROLE_KEY not set" };
  if (!session) return { skip: "no signed-in user (SMOKE_EMAIL / SMOKE_PASSWORD not set)" };

  const name = `smoke-test-${Date.now()}`;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let childId = null;
  try {
    // Create through the real RPC the app uses, as the signed-in user.
    const { data: created, error } = await session.client.rpc("create_child_profile", {
      p_display_name: name,
      p_avatar_emoji: "🧪",
    });
    assert(!error, `create_child_profile failed: ${error?.message}`);
    assert(created?.id, "create_child_profile returned no id");
    childId = created.id;

    const { data: readBack, error: readErr } = await admin
      .from("profiles")
      .select("id, display_name, parent_id")
      .eq("id", childId)
      .single();
    assert(!readErr, `read back failed: ${readErr?.message}`);
    assert(readBack.display_name === name, `read back name mismatch: ${readBack.display_name}`);
    assert(
      readBack.parent_id === session.user.id,
      "child parent_id does not match the creating user"
    );
    return `created ${childId} and read it back`;
  } finally {
    if (childId) await admin.from("profiles").delete().eq("id", childId);
  }
});

// ── 6. A tutor cannot read another tutor's students ──────────────────────────
await test("tutor cannot read another tutor's students", async () => {
  if (!session) return { skip: "no signed-in user (SMOKE_EMAIL / SMOKE_PASSWORD not set)" };
  if (!SUPABASE_URL || !SERVICE_KEY) return { skip: "SUPABASE_SERVICE_ROLE_KEY not set" };

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: others } = await admin
    .from("tutor_students")
    .select("tutor_user_id")
    .is("removed_at", null)
    .neq("tutor_user_id", session.user.id)
    .limit(1);

  if (!others || others.length === 0)
    return { skip: "no other tutor with active students exists to test against" };

  const victim = others[0].tutor_user_id;
  const { data, error } = await session.client.rpc("get_tutor_students", {
    p_tutor: victim,
  });
  assert(!error, `rpc errored unexpectedly: ${error?.message}`);
  assert(
    Array.isArray(data) && data.length === 0,
    `LEAK: reading tutor ${victim} returned ${data?.length} student rows`
  );
  return `passing another tutor's id returned 0 rows`;
});

// ── 7. Cron endpoints reject requests without CRON_SECRET ────────────────────
await test("cron endpoint rejects missing/incorrect CRON_SECRET", async () => {
  const none = await raw("/api/cron/trial-reminder");
  assert(none.status === 401, `no auth header: expected 401, got ${none.status}`);
  const wrong = await raw("/api/cron/trial-reminder", {
    headers: { Authorization: "Bearer definitely-not-the-secret" },
  });
  assert(wrong.status === 401, `wrong secret: expected 401, got ${wrong.status}`);
  return "401 with no header, 401 with wrong secret";
});

// ── Summary ──────────────────────────────────────────────────────────────────
const failed = results.filter((r) => r.status === "FAIL");
const skipped = results.filter((r) => r.status === "SKIP");
const passed = results.filter((r) => r.status === "PASS");

console.log(`\n${"─".repeat(70)}`);
console.log(`Target: ${BASE}`);
console.log(`${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped`);

if (skipped.length) {
  console.log(`\nSKIPPED (these paths are UNVERIFIED, not green):`);
  for (const s of skipped) console.log(`  - ${s.name}: ${s.detail}`);
}
if (failed.length) {
  console.log(`\nFAILED:`);
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
process.exit(0);
