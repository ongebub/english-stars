import { NextRequest, NextResponse } from "next/server";
import { decideDownload, getAdminClient, supabaseStore } from "@/lib/worksheet-orders";
import { WORKSHEET_BUCKET } from "@/lib/worksheet-shop";

export const dynamic = "force-dynamic";

/** Seconds a minted Supabase signed URL stays valid. The browser follows it at once. */
const SIGNED_URL_SECONDS = 60;

/**
 * GET /api/worksheets/download?t=<order token>&n=<file index>
 *
 * The token is the buyer's proof of purchase (unguessable, 24 random bytes,
 * stored on the order). A valid one is exchanged for a fresh 60-second signed
 * URL on the private bucket and the browser is redirected to it, so no
 * long-lived storage URL is ever emailed or shown.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  const n = Number(req.nextUrl.searchParams.get("n") ?? "0");
  const noStore = { "Cache-Control": "no-store" };

  try {
    const store = supabaseStore();
    const d = await decideDownload(store, token, n);
    if (!d.ok) return NextResponse.json({ error: d.error }, { status: d.status, headers: noStore });

    const { data, error } = await getAdminClient()
      .storage.from(WORKSHEET_BUCKET)
      .createSignedUrl(d.key, SIGNED_URL_SECONDS, { download: d.filename });
    if (error || !data?.signedUrl) {
      console.error("Worksheet signed URL failed:", error?.message);
      return NextResponse.json({ error: "File unavailable" }, { status: 502, headers: noStore });
    }
    await store.bumpDownload(d.order.id).catch(() => {});
    return NextResponse.redirect(data.signedUrl, { status: 302, headers: noStore });
  } catch (err) {
    console.error("Worksheet download error:", err);
    return NextResponse.json({ error: "Download failed" }, { status: 500, headers: noStore });
  }
}
