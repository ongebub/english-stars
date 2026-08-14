#!/usr/bin/env node
/**
 * Runs the Supabase security advisor and exits non-zero on any ERROR-level
 * finding, so it can be run by hand or wired into CI.
 *
 *   npm run security-check
 *
 * Requires SUPABASE_ACCESS_TOKEN (a Supabase personal access token, created at
 * https://supabase.com/dashboard/account/tokens) and SUPABASE_PROJECT_REF.
 * SUPABASE_PROJECT_REF is derived from NEXT_PUBLIC_SUPABASE_URL when not set.
 *
 * Exit codes:
 *   0  no ERROR-level findings (WARN and INFO are printed, not fatal)
 *   1  at least one ERROR-level finding
 *   2  could not run the advisor at all
 *
 * Exit 2 is deliberately non-zero: "we could not check" must never be mistaken
 * for "we checked and it was clean".
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

if (!TOKEN) {
  console.error("security-check: SUPABASE_ACCESS_TOKEN is not set — cannot run the advisor.");
  console.error("Create one at https://supabase.com/dashboard/account/tokens");
  process.exit(2);
}
if (!REF) {
  console.error("security-check: could not determine the project ref.");
  console.error("Set SUPABASE_PROJECT_REF, or NEXT_PUBLIC_SUPABASE_URL.");
  process.exit(2);
}

const url = `https://api.supabase.com/v1/projects/${REF}/advisors/security`;
let payload;
try {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) {
    console.error(`security-check: advisor request failed — HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(2);
  }
  payload = await res.json();
} catch (err) {
  console.error(`security-check: advisor request threw — ${err.message}`);
  process.exit(2);
}

const lints = payload.lints || [];
const byLevel = (lvl) => lints.filter((l) => (l.level || "").toUpperCase() === lvl);
const errors = byLevel("ERROR");
const warns = byLevel("WARN");
const infos = byLevel("INFO");

const show = (title, list) => {
  if (!list.length) return;
  console.log(`\n${title} (${list.length}):`);
  for (const l of list) {
    console.log(`  [${l.name}] ${l.title}`);
    console.log(`    ${l.detail}`);
    if (l.remediation) console.log(`    ${l.remediation}`);
  }
};

console.log(`Supabase security advisor — project ${REF}`);
show("ERROR", errors);
show("WARN", warns);
show("INFO", infos);

console.log(`\n${"─".repeat(70)}`);
console.log(`${errors.length} error, ${warns.length} warn, ${infos.length} info`);

if (errors.length) {
  console.error(`\nFAILED: ${errors.length} ERROR-level finding(s). This blocks the change.`);
  process.exit(1);
}
console.log("\nNo ERROR-level findings.");
process.exit(0);
