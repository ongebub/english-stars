/**
 * Only a same-site relative path may be followed after login / auth callbacks.
 * Rejects absolute URLs, protocol-relative "//host", and "/\host" (browsers
 * treat a backslash as a slash), plus control characters. Returns `fallback`
 * (null by default) for anything else.
 */
export function safeRelativePath(raw: string | null | undefined, fallback: string | null = null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (raw.includes("\\") || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
