/**
 * Device fingerprinting for the trusted-device (2FA) check.
 *
 * WHY THIS IS NOT JUST A HASH OF navigator.userAgent ANY MORE
 *
 * The first version hashed the user-agent string whole. That string carries
 * the browser's *version number*, so every browser auto-update produced a new
 * hash, silently un-trusted the device, and pushed the user back into the
 * emailed-code flow. Chrome on Android updates roughly monthly, which made
 * this fire against every user on a schedule rather than as an edge case.
 *
 * It is what locked Matt out on 2026-09-21: his trusted row from 2026-08-04
 * was the same phone and the same browser, recorded under a hash that seven
 * weeks of Chrome releases had moved out from under him.
 *
 * So we hash the browser *family* and OS *family* — deliberately no version
 * numbers — plus a rotation-independent screen size and the timezone.
 *
 * This is a convenience check, not a security boundary. Two identical phones
 * in the same timezone running the same browser collide by design, and that is
 * acceptable: the fingerprint only decides whether to email a code, and the
 * user still has to hold the account password to get this far.
 */

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Browser family, without a version. Order matters: Samsung Internet and Edge
 * both put "Chrome" in their user-agent, and every Chromium browser puts
 * "Safari" in there, so the more specific tests have to run first.
 */
export function browserFamily(ua: string): string {
  if (ua.includes("SamsungBrowser")) return "SamsungBrowser";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Firefox") || ua.includes("FxiOS")) return "Firefox";
  if (ua.includes("CriOS") || ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Browser";
}

/** OS family, without a version. Android before Linux, iPhone before Mac. */
export function osFamily(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone")) return "iOS";
  if (ua.includes("iPad")) return "iPadOS";
  if (ua.includes("Mac")) return "Mac";
  if (ua.includes("Linux")) return "Linux";
  return "";
}

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";

  const ua = navigator.userAgent;

  // min x max rather than width x height: several Android browsers swap the
  // two on rotation, which would otherwise un-trust a device for the crime of
  // being held sideways.
  const short = Math.min(screen.width, screen.height);
  const long = Math.max(screen.width, screen.height);

  const parts = [
    browserFamily(ua),
    osFamily(ua),
    `${short}x${long}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];

  return sha256Hex(parts.join("|"));
}

/**
 * The pre-2026-09-21 algorithm.
 *
 * Kept ONLY so /api/auth/check-device can recognise a device that was trusted
 * under the old scheme and migrate that row onto the new hash in place, rather
 * than making every existing user re-verify once on rollout.
 *
 * Safe to delete — along with the legacy_device_hash handling in that route —
 * once trusted_devices holds no rows created before the rollout.
 */
export async function getLegacyDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";

  const parts = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];

  return sha256Hex(parts.join("|"));
}

export function getDeviceLabel(): string {
  if (typeof window === "undefined") return "Unknown";

  // Same helpers as the hash, so the label shown to the user can never
  // disagree with the device that was actually recorded.
  const ua = navigator.userAgent;
  const browser = browserFamily(ua);
  const os = osFamily(ua);

  return os ? `${browser} on ${os}` : browser;
}
