import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe for the /interview worksheet list.
 *
 * The token is the only credential, so it is a random uuid stored per row and
 * matched exactly — it is not derived from the address or the row id, and
 * knowing someone's email tells you nothing about their token.
 *
 * Responds with a plain HTML page rather than JSON because this URL is opened
 * by a human clicking a link in an email client.
 *
 * Always renders the same confirmation, valid token or not. Telling a visitor
 * "that token does not exist" would turn this into an oracle for probing which
 * tokens are live, and there is nothing useful the person could do about it
 * either way.
 */
/**
 * Builds a FRESH response every call. This must not be hoisted to a
 * module-level constant.
 *
 * It was, and the security review caught it: a NextResponse body is a
 * ReadableStream, and a stream can only be consumed once. Reusing one response
 * object across requests meant the first click drained it and every click after
 * that returned 200 with a ZERO-BYTE BODY — a blank white page. The database
 * update worked the whole time, so the person was in fact unsubscribed, but had
 * no way to tell and would reasonably hit "mark as spam" instead.
 */
function page(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
         background: #F5F7FA; color: #37474F; margin: 0;
         display: flex; min-height: 100vh; align-items: center; justify-content: center; }
  .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 420px;
          margin: 16px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  h1 { color: #1A237E; font-size: 20px; margin: 0 0 12px; }
  p { font-size: 15px; line-height: 1.7; margin: 0; }
  a { color: #0288D1; }
</style>
</head>
<body><div class="card"><h1>${title}</h1><p>${body}</p></div></body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

const confirmation = () =>
  page(
    "ยกเลิกรับอีเมลแล้ว",
    "เราจะไม่ส่งอีเมลถึงคุณอีก<br><span style=\"color:#90A4AE;font-size:13px\">You have been unsubscribed. We will not email you again.</span>"
  );

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");

  // Shape-check before touching the database: the column is uuid, so a
  // malformed token would otherwise produce a Postgres cast error rather than
  // a clean miss.
  const isUuid =
    typeof token === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

  if (!isUuid) return confirmation();

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("printable_requests")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("unsubscribe_token", token)
      .is("unsubscribed_at", null);

    if (error) console.error("unsubscribe failed:", error);
  } catch (err) {
    console.error("unsubscribe threw:", err);
  }

  return confirmation();
}
