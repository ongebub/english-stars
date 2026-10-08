/**
 * Unit checks for the worksheet shop. Stripe, Supabase and Resend are all
 * stubbed; nothing here touches the network.
 *
 *   node scripts/test-worksheet-shop.mjs
 *
 * Compiles the shop modules with tsc into a temp dir (the repo has no test
 * runner), maps the "@/" alias, and runs two passes: first against the code as
 * committed (everything must be off), then against a patched COPY of the
 * compiled output with the master switch on, to exercise the paths that can
 * only run when something is for sale. Source files are never modified.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert";

const repo = process.cwd();
const out = mkdtempSync(join(tmpdir(), "worksheet-test-"));
let passed = 0;
const ok = (name) => { passed++; console.log("ok -", name); };

try {
  const cfg = join(out, "tsconfig.json");
  writeFileSync(cfg, JSON.stringify({
    compilerOptions: {
      outDir: join(out, "js"), rootDir: join(repo, "src/lib"), module: "commonjs", target: "es2020",
      lib: ["es2020", "dom"], skipLibCheck: true, esModuleInterop: true, moduleResolution: "node",
      baseUrl: repo, paths: { "@/*": ["src/*"] }, strict: true, types: ["node"], typeRoots: [join(repo, "node_modules/@types")],
    },
    files: ["worksheet-shop", "worksheet-checkout", "worksheet-orders", "packs"].map((f) => join(repo, "src/lib", f + ".ts")),
  }));
  execFileSync("npx", ["tsc", "-p", cfg], { stdio: "inherit" });
  const js = join(out, "js");

  process.env.NODE_PATH = join(repo, "node_modules");
  const Module = createRequire(import.meta.url)("node:module");
  Module._initPaths();
  const orig = Module._resolveFilename;
  Module._resolveFilename = function (req, ...rest) {
    if (req.startsWith("@/lib/")) req = join(js, req.slice(6));
    return orig.call(this, req, ...rest);
  };
  const require = createRequire(join(js, "x.js"));
  const load = () => {
    for (const k of Object.keys(require.cache)) if (k.startsWith(js)) delete require.cache[k];
    return {
      shop: require(join(js, "worksheet-shop.js")),
      co: require(join(js, "worksheet-checkout.js")),
      ord: require(join(js, "worksheet-orders.js")),
    };
  };

  /* ── pass 1: master switch OFF ────────────────────────────────────────────
     The shop went on sale 2026-10-08, so the committed value is now true.
     Force it off in the temp copy only, so the off-state guarantees below are
     still tested whichever way the committed switch points. */
  {
    const f0 = join(js, "worksheet-shop.js");
    const src0 = readFileSync(f0, "utf8");
    assert.ok(/exports\.SHOP_ENABLED = (true|false)/.test(src0));
    ok("committed SHOP_ENABLED is " + /exports\.SHOP_ENABLED = true/.test(src0));
    writeFileSync(f0, src0.replace("exports.SHOP_ENABLED = true", "exports.SHOP_ENABLED = false"));
    const { shop, co } = load();
    assert.strictEqual(shop.SHOP_ENABLED, false); ok("SHOP_ENABLED forced false for the off-state pass");
    const ids = Object.keys(shop.OFFERS);
    assert.deepStrictEqual(ids, ["1", "2", "3", "4", "5", "6", "bundle"]); ok("six packs plus bundle");
    for (const id of ids) {
      assert.strictEqual(shop.OFFERS[id].onSale, false, `pack ${id} onSale`);
      assert.ok(shop.saleBlockers(shop.OFFERS[id]).length > 0);
    }
    ok("every offer ships onSale:false and has blockers");
    const price = Object.fromEntries(ids.map((i) => [i, shop.OFFERS[i].priceThb]));
    assert.deepStrictEqual(price, { 1: 89, 2: 59, 3: 59, 4: 59, 5: 89, 6: 59, bundle: 299 });
    const pg = Object.fromEntries(ids.map((i) => [i, shop.OFFERS[i].pages]));
    assert.deepStrictEqual(pg, { 1: 26, 2: 25, 3: 25, 4: 24, 5: 22, 6: 26, bundle: 148 });
    assert.ok(shop.OFFERS["5"].description.en.includes("color printing") && shop.OFFERS["5"].description.th.includes("พิมพ์สี"));
    ok("prices, page counts and the pack 5 color-printing note");

    let calls = 0;
    const stub = { checkout: { sessions: { create: async () => { calls++; return { url: "https://stub" }; } } } };
    for (const id of ids) {
      const r = await co.createWorksheetCheckout(stub, id, { origin: "https://x", lang: "th" });
      assert.strictEqual(r.ok, false); assert.strictEqual(r.status, 403);
    }
    assert.strictEqual(calls, 0); ok("every offer refused with 403, Stripe stub called 0 times");

    for (const bad of ["7", "", "__proto__", "constructor", "toString", null, undefined, 1, {}]) {
      const r = await co.createWorksheetCheckout(stub, bad, { origin: "https://x", lang: "th" });
      assert.strictEqual(r.ok, false); assert.strictEqual(r.status, 400);
    }
    assert.strictEqual(calls, 0); ok("unknown and prototype-ish offer ids are 400, no Stripe call");

    // Even if a pack is flipped on, the master switch still blocks it.
    shop.OFFERS["1"].onSale = true;
    const r = await co.createWorksheetCheckout(stub, "1", { origin: "https://x", lang: "th" });
    assert.strictEqual(r.status, 403); assert.strictEqual(calls, 0);
    assert.ok(r.blockers.some((b) => b.includes("SHOP_ENABLED")));
    ok("master switch off beats onSale:true on a pack");
  }

  /* ── pass 2: master switch patched on, in the temp copy only ──────────── */
  {
    const f = join(js, "worksheet-shop.js");
    const src = readFileSync(f, "utf8");
    assert.ok(src.includes("exports.SHOP_ENABLED = false"));
    writeFileSync(f, src.replace("exports.SHOP_ENABLED = false", "exports.SHOP_ENABLED = true"));
    const { shop, co, ord } = load();

    const p1 = shop.OFFERS["1"];
    assert.strictEqual(p1.onSale, true);
    assert.deepStrictEqual(shop.saleBlockers(p1), []); ok("flipping the one SHOP_ENABLED line makes pack 1 sellable");
    for (const id of Object.keys(shop.OFFERS)) assert.deepStrictEqual(shop.saleBlockers(shop.OFFERS[id]), [], id);
    ok("and every other pack and the bundle");
    shop.OFFERS["2"].pages = null; shop.OFFERS["2"].copyConfirmed = false;
    assert.ok(shop.saleBlockers(shop.OFFERS["2"]).length >= 2); ok("an unfinished pack stays blocked even with switch and onSale on");
    shop.OFFERS["3"].priceThb = 5;
    assert.ok(shop.saleBlockers(shop.OFFERS["3"]).some((b) => b.includes("price"))); ok("price below Stripe minimum blocks sale");
    shop.OFFERS["3"].priceThb = 59.5;
    assert.ok(shop.saleBlockers(shop.OFFERS["3"]).some((b) => b.includes("price"))); ok("fractional baht blocks sale");

    let params = null, n = 0;
    const stub = { checkout: { sessions: { create: async (p) => { n++; params = p; return { url: "https://stub/session" }; } } } };
    const r = await co.createWorksheetCheckout(stub, "1", { origin: "https://site", lang: "en" });
    assert.deepStrictEqual(r, { ok: true, url: "https://stub/session" }); assert.strictEqual(n, 1);
    assert.strictEqual(params.mode, "payment");
    assert.deepStrictEqual(params.payment_method_types, ["card"]);
    assert.strictEqual(params.line_items.length, 1);
    assert.strictEqual(params.line_items[0].price_data.currency, "thb");
    assert.strictEqual(params.line_items[0].price_data.unit_amount, 8900);
    assert.strictEqual(params.line_items[0].price, undefined);
    assert.strictEqual(params.metadata.kind, "worksheet"); assert.strictEqual(params.metadata.offer, "1");
    assert.strictEqual(params.metadata.supabase_user_id, undefined);
    assert.strictEqual(params.subscription_data, undefined);
    assert.ok(params.success_url.startsWith("https://site/worksheets/thanks?session_id={CHECKOUT_SESSION_ID}"));
    assert.strictEqual(params.cancel_url, "https://site/worksheets");
    ok("session params: payment mode, card only, inline THB price_data in satang, no user id, no subscription");

    /* fulfilment against an in-memory store */
    const mem = () => {
      const rows = [], events = [];
      let id = 0;
      return {
        rows, events,
        async insertIfAbsent(row) {
          const ex = rows.find((r) => r.stripe_session_id === row.stripe_session_id);
          if (ex) return { order: ex, created: false };
          const o = { id: String(++id), download_count: 0, email_claimed_at: null, email_sent_at: null, ...row };
          rows.push(o); return { order: o, created: true };
        },
        async claimEmail(oid, now) {
          const o = rows.find((r) => r.id === oid);
          const stale = !o.email_claimed_at || new Date(o.email_claimed_at) < new Date(now.getTime() - 5 * 60000);
          if (o.email_sent_at || !stale) return false;
          o.email_claimed_at = now.toISOString(); return true;
        },
        async markEmailSent(oid, now) { rows.find((r) => r.id === oid).email_sent_at = now.toISOString(); },
        async recordEvent(s, e, p) { events.push({ s, e, p }); },
        async getByToken(t) { return rows.find((r) => r.download_token === t) ?? null; },
        async getBySession(s) { return rows.find((r) => r.stripe_session_id === s) ?? null; },
        async bumpDownload(oid) { rows.find((r) => r.id === oid).download_count++; },
      };
    };
    const session = (over = {}) => ({
      id: "cs_live_abc123", payment_status: "paid", currency: "thb", amount_total: 5900,
      customer_details: { email: "buyer@example.com" }, metadata: { kind: "worksheet", offer: "1" }, ...over,
    });
    const sent = [];
    const sendEmail = async (to, offer, links) => { sent.push({ to, offer: offer.id, links }); };

    const store = mem();
    const a = await ord.fulfilWorksheetSession(session(), { store, sendEmail, origin: "https://site" });
    assert.strictEqual(a.status, "delivered"); assert.strictEqual(a.emailed, true);
    assert.strictEqual(sent.length, 1); assert.strictEqual(sent[0].to, "buyer@example.com");
    assert.ok(sent[0].links[0].url.startsWith("https://site/api/worksheets/download?t="));
    assert.deepStrictEqual(store.events, [{ s: "cs_live_abc123", e: "worksheet_purchased", p: "pack-1" }]);
    assert.strictEqual(store.rows[0].amount_thb, 59);
    ok("paid session: order saved, one email, one worksheet_purchased event with plan pack-1");

    const b = await ord.fulfilWorksheetSession(session(), { store, sendEmail });
    assert.strictEqual(b.emailed, false); assert.strictEqual(sent.length, 1); assert.strictEqual(store.events.length, 1);
    ok("replayed webhook / thanks-page hit: no second email, no second event");

    const s2 = mem(); sent.length = 0;
    await Promise.all([1, 2, 3].map(() => ord.fulfilWorksheetSession(session(), { store: s2, sendEmail })));
    assert.strictEqual(sent.length, 1); assert.strictEqual(s2.events.length, 1); assert.strictEqual(s2.rows.length, 1);
    ok("three concurrent callers (webhook + thanks page + retry): one order, one email");

    const s3 = mem(); sent.length = 0; let fail = true;
    const flaky = async (...a) => { if (fail) throw new Error("Resend refused"); return sendEmail(...a); };
    await assert.rejects(ord.fulfilWorksheetSession(session(), { store: s3, sendEmail: flaky, now: new Date("2026-01-01T00:00:00Z") }), /Resend refused/);
    assert.strictEqual(s3.rows.length, 1); assert.strictEqual(s3.rows[0].email_sent_at, null);
    fail = false;
    const early = await ord.fulfilWorksheetSession(session(), { store: s3, sendEmail: flaky, now: new Date("2026-01-01T00:01:00Z") });
    assert.strictEqual(early.emailed, false); // claim still fresh
    const late = await ord.fulfilWorksheetSession(session(), { store: s3, sendEmail: flaky, now: new Date("2026-01-01T00:10:00Z") });
    assert.strictEqual(late.emailed, true); assert.strictEqual(sent.length, 1);
    ok("failed email is not marked sent; order survives; a retry after the claim goes stale delivers");

    const s4 = mem(); sent.length = 0;
    assert.strictEqual((await ord.fulfilWorksheetSession(session({ payment_status: "unpaid" }), { store: s4, sendEmail })).status, "unpaid");
    assert.strictEqual((await ord.fulfilWorksheetSession(session({ metadata: { supabase_user_id: "u1" } }), { store: s4, sendEmail })).status, "ignored");
    assert.strictEqual((await ord.fulfilWorksheetSession(session({ metadata: { kind: "worksheet", offer: "99" } }), { store: s4, sendEmail })).status, "ignored");
    assert.strictEqual((await ord.fulfilWorksheetSession(session({ currency: "usd" }), { store: s4, sendEmail })).status, "ignored");
    assert.strictEqual(s4.rows.length, 0); assert.strictEqual(sent.length, 0);
    ok("unpaid, subscription-style, unknown-offer and wrong-currency sessions create nothing");

    // A paid order is delivered even if the pack is switched off afterwards.
    const s5 = mem(); shop.OFFERS["1"].onSale = false; sent.length = 0;
    assert.strictEqual((await ord.fulfilWorksheetSession(session(), { store: s5, sendEmail })).emailed, true);
    ok("a paid order is still delivered after the pack is switched off");

    /* bundle */
    const s6 = mem(); sent.length = 0;
    await ord.fulfilWorksheetSession(session({ id: "cs_live_bundle1", amount_total: 29900, metadata: { kind: "worksheet", offer: "bundle" } }), { store: s6, sendEmail });
    assert.strictEqual(sent[0].links.length, 6); assert.strictEqual(s6.events[0].p, "pack-bundle");
    ok("bundle: six links, plan pack-bundle");

    /* download decisions */
    const tok = store.rows[0].download_token;
    const d = await ord.decideDownload(store, tok, 0);
    assert.ok(d.ok); assert.strictEqual(d.key, "packs/pack-01.pdf"); assert.ok(d.filename.endsWith(".pdf"));
    assert.strictEqual((await ord.decideDownload(store, "x".repeat(32), 0)).status, 404);
    assert.strictEqual((await ord.decideDownload(store, null, 0)).status, 404);
    assert.strictEqual((await ord.decideDownload(store, tok, 1)).status, 404);
    assert.strictEqual((await ord.decideDownload(store, tok, -1)).status, 404);
    assert.strictEqual((await ord.decideDownload(store, tok, 0, new Date("2099-01-01"))).status, 410);
    store.rows[0].download_count = ord.MAX_DOWNLOADS;
    assert.strictEqual((await ord.decideDownload(store, tok, 0)).status, 429);
    const bt = s6.rows[0].download_token;
    assert.ok((await ord.decideDownload(s6, bt, 5)).ok); assert.strictEqual((await ord.decideDownload(s6, bt, 6)).status, 404);
    ok("download: good token ok; bad/missing 404; bad index 404; expired 410; over cap 429; bundle indexes 0-5");
  }

  /* ── the subscription webhook is untouched and ignores worksheet sessions ─ */
  const sub = readFileSync(join(repo, "src/app/api/stripe/webhook/route.ts"), "utf8");
  assert.ok(sub.includes("if (userId && session.subscription)"));
  assert.ok(!/worksheet/i.test(sub));
  ok("subscription webhook acts only on userId && subscription, and does not mention worksheets");

  console.log(`\n${passed} checks passed`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
