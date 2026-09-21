/**
 * Tests for src/lib/device-fingerprint.ts
 *
 *   node scripts/test-device-fingerprint.mjs
 *
 * The repo has no test runner, so this compiles the one module with tsc into a
 * temp directory and exercises it against stubbed browser globals. No new
 * dependency, nothing to configure.
 *
 * What it is guarding: on 2026-09-21 Matt was locked out of his own account
 * because the fingerprint hashed navigator.userAgent whole, so a routine
 * Chrome update silently un-trusted his phone and demanded an emailed code.
 * The headline assertion is that a version bump no longer changes the hash —
 * and, just as importantly, a regression guard asserting the OLD algorithm
 * did change, so the headline can never pass for the wrong reason.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert';

const out = mkdtempSync(join(tmpdir(), 'fingerprint-test-'));

try {
  execFileSync(
    'npx',
    ['tsc', 'src/lib/device-fingerprint.ts',
     '--outDir', out,
     '--module', 'es2020', '--target', 'es2020',
     '--lib', 'es2020,dom', '--skipLibCheck'],
    { stdio: 'inherit' }
  );

  const fp = await import(pathToFileURL(join(out, 'device-fingerprint.js')).href);

  // Node exposes `navigator` as a getter-only global, so a plain assignment is
  // silently dropped — and every simulated device then hashes identically,
  // which would make the headline assertion pass for entirely the wrong
  // reason. defineProperty is not optional here.
  function setGlobal(name, value) {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  }

  async function withDevice({ ua, w, h, tz }, fn) {
    setGlobal('window', {});
    setGlobal('navigator', { userAgent: ua });
    setGlobal('screen', { width: w, height: h });
    const RealDTF = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function () {
      return { resolvedOptions: () => ({ timeZone: tz }) };
    };
    try {
      return await fn();
    } finally {
      Intl.DateTimeFormat = RealDTF;
    }
  }

  let pass = 0;
  let fail = 0;
  function check(name, got, want) {
    try {
      assert.strictEqual(got, want);
      console.log('  ok   ' + name);
      pass++;
    } catch {
      console.log(`  FAIL ${name}\n         got  ${got}\n         want ${want}`);
      fail++;
    }
  }

  // Matt's phone: real Chrome-on-Android user agents, seven weeks apart.
  const AUG = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.6533.103 Mobile Safari/537.36';
  const SEP = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Mobile Safari/537.36';
  const PHONE = { w: 360, h: 780, tz: 'Asia/Bangkok' };

  console.log('\nThe bug that locked Matt out — Chrome auto-update:');
  const aug = await withDevice({ ua: AUG, ...PHONE }, fp.getDeviceFingerprint);
  const sep = await withDevice({ ua: SEP, ...PHONE }, fp.getDeviceFingerprint);
  check('same phone survives a Chrome version bump', sep, aug);

  const augOld = await withDevice({ ua: AUG, ...PHONE }, fp.getLegacyDeviceFingerprint);
  const sepOld = await withDevice({ ua: SEP, ...PHONE }, fp.getLegacyDeviceFingerprint);
  check('old algorithm did NOT survive it (guards the test above)', sepOld !== augOld, true);

  console.log('\nRotation:');
  const landscape = await withDevice({ ua: SEP, w: 780, h: 360, tz: 'Asia/Bangkok' }, fp.getDeviceFingerprint);
  check('turning the phone sideways does not un-trust it', landscape, sep);

  console.log('\nStill discriminates where it should:');
  const otherTz = await withDevice({ ua: SEP, w: 360, h: 780, tz: 'America/Chicago' }, fp.getDeviceFingerprint);
  check('different timezone -> different device', otherTz !== sep, true);
  const tablet = await withDevice({ ua: SEP, w: 800, h: 1280, tz: 'Asia/Bangkok' }, fp.getDeviceFingerprint);
  check('different screen -> different device', tablet !== sep, true);
  const FIREFOX = 'Mozilla/5.0 (Android 14; Mobile; rv:129.0) Gecko/129.0 Firefox/129.0';
  const ff = await withDevice({ ua: FIREFOX, ...PHONE }, fp.getDeviceFingerprint);
  check('different browser -> different device', ff !== sep, true);

  console.log('\nUser-agent family parsing (the order-sensitive cases):');
  const cases = [
    // Samsung Internet and Edge both say "Chrome"; every Chromium says "Safari".
    ['Samsung Internet',  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36', 'SamsungBrowser', 'Android'],
    ['Edge',              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0', 'Edge', 'Windows'],
    ['Chrome on iOS',     'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1', 'Chrome', 'iOS'],
    ['Safari on iPhone',  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1', 'Safari', 'iOS'],
    ['Safari on Mac',     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15', 'Safari', 'Mac'],
    ['Chrome on Android', 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/129.0.0.0 Mobile Safari/537.36', 'Chrome', 'Android'],
  ];
  for (const [name, ua, wantBrowser, wantOs] of cases) {
    check(`${name} -> browser`, fp.browserFamily(ua), wantBrowser);
    check(`${name} -> os`, fp.osFamily(ua), wantOs);
  }

  console.log('\nNo version digits reach the hashed input:');
  check('browserFamily is version-free', /\d/.test(fp.browserFamily(SEP)), false);
  check('osFamily is version-free', /\d/.test(fp.osFamily(SEP)), false);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
} finally {
  rmSync(out, { recursive: true, force: true });
}
