/**
 * Worksheet orders: record a paid Checkout session once, deliver it once, and
 * hand out short-lived download links on request.
 *
 * Both the webhook and the thanks page call fulfilWorksheetSession(), so a
 * buyer is served even if one of the two never fires. It is idempotent: the
 * order row is unique on stripe_session_id, and the email is sent under a claim
 * (email_claimed_at) so two concurrent callers cannot both send it.
 *
 * The store is an interface so unit checks run against memory and never need
 * Supabase or Stripe. The Supabase implementation is at the bottom.
 */
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getOffer, fileLabels, WORKSHEET_BUCKET, type Offer } from "@/lib/worksheet-shop";
import { WORKSHEET_KIND } from "@/lib/worksheet-checkout";

/** How long an emailed link keeps working, and how often it may be used. */
export const LINK_TTL_DAYS = 365;
export const MAX_DOWNLOADS = 50;
/** An email claim older than this is treated as a crashed attempt and retried. */
const CLAIM_STALE_MS = 5 * 60 * 1000;

export type Order = {
  id: string;
  stripe_session_id: string;
  offer: string;
  email: string | null;
  amount_thb: number | null;
  download_token: string;
  download_count: number;
  expires_at: string;
  email_claimed_at: string | null;
  email_sent_at: string | null;
};

export type NewOrder = Omit<Order, "id" | "download_count" | "email_claimed_at" | "email_sent_at">;

export interface OrderStore {
  /** Insert, or return the existing row if this session was already recorded. */
  insertIfAbsent(row: NewOrder): Promise<{ order: Order; created: boolean }>;
  /** Atomically take the right to send the email. false = someone else has it or it is sent. */
  claimEmail(orderId: string, now: Date): Promise<boolean>;
  markEmailSent(orderId: string, now: Date): Promise<void>;
  recordEvent(sessionId: string, event: string, plan: string): Promise<void>;
  getByToken(token: string): Promise<Order | null>;
  getBySession(sessionId: string): Promise<Order | null>;
  bumpDownload(orderId: string): Promise<void>;
}

/** The slice of a Stripe Checkout Session this module reads. */
export type SessionLike = {
  id: string;
  payment_status: string;
  currency: string | null;
  amount_total: number | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
};

export type SendEmail = (to: string, offer: Offer, links: { label: string; url: string }[]) => Promise<void>;

export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://englishallstars.com";
}

export function downloadUrl(token: string, fileIndex: number, origin = siteOrigin()): string {
  return `${origin}/api/worksheets/download?t=${encodeURIComponent(token)}&n=${fileIndex}`;
}

export function isWorksheetSession(s: { metadata?: Record<string, string> | null }): boolean {
  return s.metadata?.kind === WORKSHEET_KIND;
}

export type FulfilResult =
  | { status: "ignored"; reason: string }
  | { status: "unpaid" }
  | { status: "delivered"; order: Order; emailed: boolean };

/**
 * Throws if the email could not be sent, so the webhook answers 500 and Stripe
 * retries. The order row and token are already saved by then, which is what
 * lets the thanks page serve the buyer in the meantime.
 */
export async function fulfilWorksheetSession(
  session: SessionLike,
  deps: { store: OrderStore; sendEmail: SendEmail; now?: Date; origin?: string }
): Promise<FulfilResult> {
  const { store, sendEmail } = deps;
  const now = deps.now ?? new Date();

  if (!isWorksheetSession(session)) return { status: "ignored", reason: "not a worksheet session" };
  if (session.payment_status !== "paid") return { status: "unpaid" };

  // Deliberately NOT gated on onSale: a buyer who has paid is delivered even if
  // the pack is switched off a minute later.
  const offer = getOffer(session.metadata?.offer);
  if (!offer) return { status: "ignored", reason: `unknown offer ${session.metadata?.offer}` };
  if (session.currency !== "thb") return { status: "ignored", reason: `unexpected currency ${session.currency}` };

  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const expires = new Date(now.getTime() + LINK_TTL_DAYS * 86400_000).toISOString();

  const { order, created } = await store.insertIfAbsent({
    stripe_session_id: session.id,
    offer: offer.id,
    email,
    amount_thb: session.amount_total === null ? null : Math.round(session.amount_total / 100),
    download_token: randomBytes(24).toString("base64url"),
    expires_at: expires,
  });

  // Once per order, because it hangs off the insert that actually created it.
  if (created) {
    try {
      await store.recordEvent(session.id, "worksheet_purchased", offer.plan);
    } catch (e) {
      console.error("Failed to track worksheet_purchased:", e);
    }
  }

  if (order.email_sent_at) return { status: "delivered", order, emailed: false };
  if (!order.email) {
    // Cannot happen for a card Checkout, which always collects an address.
    console.error(`Worksheet order ${order.id} has no email; link is on the thanks page only`);
    return { status: "delivered", order, emailed: false };
  }

  if (!(await store.claimEmail(order.id, now))) return { status: "delivered", order, emailed: false };

  const labels = fileLabels(offer);
  const links = labels.map((label, i) => ({
    label,
    url: downloadUrl(order.download_token, i, deps.origin),
  }));
  // sendEmail throws on a Resend {error}; that propagates and the claim goes
  // stale after CLAIM_STALE_MS, so the retry can take it.
  await sendEmail(order.email, offer, links);
  await store.markEmailSent(order.id, now);
  return { status: "delivered", order, emailed: true };
}

export type DownloadDecision =
  | { ok: true; order: Order; key: string; filename: string }
  | { ok: false; status: number; error: string };

export async function decideDownload(
  store: OrderStore,
  token: string | null,
  fileIndex: number,
  now: Date = new Date()
): Promise<DownloadDecision> {
  if (!token || token.length < 16 || token.length > 128) return { ok: false, status: 404, error: "Not found" };
  const order = await store.getByToken(token);
  if (!order) return { ok: false, status: 404, error: "Not found" };
  if (new Date(order.expires_at) < now) return { ok: false, status: 410, error: "This link has expired" };
  if (order.download_count >= MAX_DOWNLOADS) return { ok: false, status: 429, error: "Download limit reached" };
  const offer = getOffer(order.offer);
  if (!offer) return { ok: false, status: 404, error: "Not found" };
  if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex >= offer.fileKeys.length) {
    return { ok: false, status: 404, error: "Not found" };
  }
  const label = fileLabels(offer)[fileIndex].replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { ok: true, order, key: offer.fileKeys[fileIndex], filename: `English-Allstars-${label}.pdf` };
}

/* ── Supabase implementation (service role) ───────────────────────────────── */

export function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export function supabaseStore(db = getAdminClient()): OrderStore {
  const T = "worksheet_orders";
  return {
    async insertIfAbsent(row) {
      const ins = await db.from(T).insert(row).select().single();
      if (!ins.error) return { order: ins.data as Order, created: true };
      // 23505 = unique_violation on stripe_session_id: already recorded.
      if (ins.error.code !== "23505") throw new Error(`worksheet_orders insert failed: ${ins.error.message}`);
      const ex = await db.from(T).select().eq("stripe_session_id", row.stripe_session_id).single();
      if (ex.error) throw new Error(`worksheet_orders read failed: ${ex.error.message}`);
      return { order: ex.data as Order, created: false };
    },
    async claimEmail(orderId, now) {
      const stale = new Date(now.getTime() - CLAIM_STALE_MS).toISOString();
      const { data, error } = await db
        .from(T)
        .update({ email_claimed_at: now.toISOString() })
        .eq("id", orderId)
        .is("email_sent_at", null)
        .or(`email_claimed_at.is.null,email_claimed_at.lt.${stale}`)
        .select("id");
      if (error) throw new Error(`worksheet_orders claim failed: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },
    async markEmailSent(orderId, now) {
      const { error } = await db.from(T).update({ email_sent_at: now.toISOString() }).eq("id", orderId);
      if (error) throw new Error(`worksheet_orders mark failed: ${error.message}`);
    },
    async recordEvent(sessionId, event, plan) {
      const { error } = await db.from("signup_events").insert({ session_id: sessionId, user_id: null, event, plan });
      if (error) throw new Error(error.message);
    },
    async getByToken(token) {
      const { data } = await db.from(T).select().eq("download_token", token).maybeSingle();
      return (data as Order) ?? null;
    },
    async getBySession(sessionId) {
      const { data } = await db.from(T).select().eq("stripe_session_id", sessionId).maybeSingle();
      return (data as Order) ?? null;
    },
    async bumpDownload(orderId) {
      // Read-modify-write; an occasional lost increment only makes the cap looser.
      const { data } = await db.from(T).select("download_count").eq("id", orderId).single();
      await db.from(T).update({ download_count: (data?.download_count ?? 0) + 1 }).eq("id", orderId);
    },
  };
}

export { WORKSHEET_BUCKET };
