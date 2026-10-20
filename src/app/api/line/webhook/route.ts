import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { autoReplyMessages, followMessages, lineReply, verifyLineSignature } from "@/lib/line";

export const dynamic = "force-dynamic";

/**
 * LINE Messaging API webhook for the @209khnuv Official Account.
 *
 *  - Public and unauthenticated by necessity; the x-line-signature HMAC is the
 *    only gate. Anything that fails it is ignored: nothing is logged, nothing is
 *    sent. It still answers 200 (Chris's spec, and LINE retries non-200s).
 *  - If LINE_CHANNEL_SECRET or LINE_CHANNEL_ACCESS_TOKEN is not set it answers
 *    200 and does nothing, so the route can ship before the vars exist.
 *  - Never reply-loops: replies go only to user-originated follow/message
 *    events that carry a replyToken, redelivered events (same webhookEventId) are
 *    dropped by a unique key, and a user gets at most one auto-reply to text per
 *    6 hours. Bot messages are never delivered to the webhook by LINE.
 *  - line_events is RLS-on with no policies: service role only.
 */

const AUTO_REPLY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

type LineEvent = {
  type?: string;
  mode?: string;
  timestamp?: number;
  webhookEventId?: string;
  replyToken?: string;
  source?: { type?: string; userId?: string };
  message?: { type?: string; text?: string };
};

function ok(processed: boolean) {
  return NextResponse.json({ ok: true, processed });
}

export async function POST(req: NextRequest) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!secret || !token) {
    console.warn("LINE webhook: LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN not set, ignoring");
    return ok(false);
  }

  const raw = await req.text();
  if (raw.length > 200_000 || !verifyLineSignature(raw, req.headers.get("x-line-signature"), secret)) {
    return ok(false);
  }

  let events: LineEvent[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.events)) events = parsed.events.slice(0, 50);
  } catch {
    return ok(false);
  }

  let supabase;
  try {
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  } catch {
    console.error("LINE webhook: Supabase not configured");
    return ok(false);
  }

  for (const ev of events) {
    try {
      // Only one-to-one chats with a user id; skip standby-mode copies.
      const userId = ev.source?.type === "user" ? ev.source.userId : undefined;
      if (!userId || ev.mode === "standby") continue;
      if (ev.type !== "follow" && ev.type !== "unfollow" && ev.type !== "message") continue;

      const isText = ev.type === "message" && ev.message?.type === "text";
      const { data: inserted, error } = await supabase
        .from("line_events")
        .insert({
          webhook_event_id: ev.webhookEventId ?? null,
          line_user_id: userId,
          event_type: ev.type,
          message_type: ev.type === "message" ? ev.message?.type ?? null : null,
          text: isText ? String(ev.message?.text ?? "").slice(0, 2000) : null,
          event_at: ev.timestamp ? new Date(ev.timestamp).toISOString() : null,
        })
        .select("id")
        .single();

      // Unique violation = LINE redelivered this event: already handled.
      if (error || !inserted) {
        if (error?.code !== "23505") console.error("line_events insert failed:", error?.code);
        continue;
      }

      if (!ev.replyToken) continue;

      let messages: { type: "text"; text: string }[] | null = null;
      if (ev.type === "follow") {
        messages = followMessages();
      } else if (isText) {
        const since = new Date(Date.now() - AUTO_REPLY_COOLDOWN_MS).toISOString();
        const { count } = await supabase
          .from("line_events")
          .select("id", { count: "exact", head: true })
          .eq("line_user_id", userId)
          .eq("replied", true)
          .eq("event_type", "message")
          .gte("created_at", since);
        if (!count) messages = autoReplyMessages();
      }

      if (messages && (await lineReply(token, ev.replyToken, messages))) {
        await supabase.from("line_events").update({ replied: true }).eq("id", inserted.id);
      }
    } catch (err) {
      console.error("LINE event error:", err instanceof Error ? err.message : "unknown");
    }
  }

  return ok(true);
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}
