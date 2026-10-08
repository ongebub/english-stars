/**
 * The worksheet shop: ONE config file for every pack on /worksheets.
 *
 * ┌─ HOW TO PUT A PACK ON SALE ───────────────────────────────────────────────┐
 * │ 1. Chris decides the price and sets `priceThb` (whole baht).              │
 * │ 2. The PDF is uploaded to the private bucket at `fileKey`.                │
 * │ 3. The migration in supabase/pending/ has been applied.                   │
 * │ 4. Flip that pack's `onSale` to true AND SHOP_ENABLED to true.            │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Nothing here is on sale. Every price below is a PLACEHOLDER and nothing may
 * be charged until Chris has set a real one. The gate is enforced on the
 * server (see `saleBlockers`, used by /api/worksheets/checkout); hiding the
 * button in the page is not the control.
 *
 * Pack ids, titles and the `pack-N` funnel plan come from the shared registry
 * in ./packs.ts, the one the /pack/[id] QR landing already uses. This file adds
 * only what the shop needs on top.
 */
import { PACKS, type PackId } from "@/lib/packs";

/** Master switch. false = the whole shop is off, whatever the packs say. */
export const SHOP_ENABLED = false;

/** Private Supabase bucket the PDFs live in. Not created yet. */
export const WORKSHEET_BUCKET = "worksheet-packs";

/** Stripe's smallest THB charge. A price under this can never be on sale. */
const MIN_PRICE_THB = 10;

export type OfferId = PackId | "bundle";

export type Offer = {
  id: OfferId;
  /** Funnel label written to signup_events.plan ("pack-1"... "pack-bundle"). */
  plan: string;
  /** English title. Product names stay English in both languages, as on the PDF covers. */
  title: string;
  description: { th: string; en: string };
  /** Pages in the PDF, or null until the PDF is final. */
  pages: number | null;
  /** Whole baht. PLACEHOLDER until Chris decides. */
  priceThb: number;
  /** Object key(s) in WORKSHEET_BUCKET. The bundle lists all six. */
  fileKeys: string[];
  /** Cover image under /public, or null for the placeholder card. */
  cover: string | null;
  /** The per-pack sale switch. */
  onSale: boolean;
  /** Has the description above been checked against the finished PDF? */
  copyConfirmed: boolean;
};

const key = (n: number) => `packs/pack-0${n}.pdf`;

/*
 * NEW THAI, written 2026-10-08, not reviewed by anyone (no reviewer exists).
 * Pack 1's Thai is the line printed on the PDF cover, reused as is. Packs 2-6
 * are written from the titles alone because those PDFs were still being built;
 * `copyConfirmed: false` keeps them off sale until checked against the files.
 */
const PACK_OFFERS: Record<PackId, Offer> = {
  "1": {
    id: "1",
    plan: PACKS["1"].plan,
    title: PACKS["1"].title,
    description: {
      th: "ฝึกสัมภาษณ์เข้าโรงเรียนหลักสูตรภาษาอังกฤษ ชั้น ป.1 ชุดฝึกพร้อมเฉลย สำหรับพิมพ์ที่บ้าน",
      en: "20 interview questions with model answers, plus matching, tracing, counting, reading and a certificate. Print at home.",
    },
    pages: 26,
    priceThb: 59, // PLACEHOLDER
    fileKeys: [key(1)],
    cover: "/worksheets/covers/pack-01.jpg",
    onSale: false,
    copyConfirmed: true,
  },
  "2": {
    id: "2",
    plan: PACKS["2"].plan,
    title: PACKS["2"].title,
    description: {
      th: "ตัวอักษร เสียง และคำแรก ให้ลาก จับคู่ และระบายสี", // NEW
      en: "Letters, sounds and first words to trace, match and color.",
    },
    pages: null,
    priceThb: 59, // PLACEHOLDER
    fileKeys: [key(2)],
    cover: null,
    onSale: false,
    copyConfirmed: false,
  },
  "3": {
    id: "3",
    plan: PACKS["3"].plan,
    title: PACKS["3"].title,
    description: {
      th: "คำศัพท์ 100 คำในชีวิตประจำวัน พร้อมภาพ ให้อ่านและเขียนตาม", // NEW
      en: "100 everyday words with pictures to read, trace and practice.",
    },
    pages: null,
    priceThb: 59, // PLACEHOLDER
    fileKeys: [key(3)],
    cover: null,
    onSale: false,
    copyConfirmed: false,
  },
  "4": {
    id: "4",
    plan: PACKS["4"].plan,
    title: PACKS["4"].title,
    description: {
      th: "นิทานสั้น ๆ กับ Nong-Fah พร้อมคำถามเช็กความเข้าใจ", // NEW
      en: "Short, simple stories with Nong-Fah, and questions to check understanding.",
    },
    pages: null,
    priceThb: 59, // PLACEHOLDER
    fileKeys: [key(4)],
    cover: null,
    onSale: false,
    copyConfirmed: false,
  },
  "5": {
    id: "5",
    plan: PACKS["5"].plan,
    title: PACKS["5"].title,
    description: {
      th: "แบบทดสอบฝึกทำ เหมือนข้อสอบเข้า ป.1", // NEW
      en: "Practice tests in the style of Grade 1 entrance exams.",
    },
    pages: null,
    priceThb: 59, // PLACEHOLDER
    fileKeys: [key(5)],
    cover: null,
    onSale: false,
    copyConfirmed: false,
  },
  "6": {
    id: "6",
    plan: PACKS["6"].plan,
    title: PACKS["6"].title,
    description: {
      th: "ฝึกนับ ระบายสี และจับคู่ ตัวเลข สี และรูปทรง", // NEW
      en: "Count, color and match numbers, colors and shapes.",
    },
    pages: null,
    priceThb: 59, // PLACEHOLDER
    fileKeys: [key(6)],
    cover: null,
    onSale: false,
    copyConfirmed: false,
  },
};

const PACK_IDS = Object.keys(PACK_OFFERS) as PackId[];

const BUNDLE_OFFER: Offer = {
  id: "bundle",
  plan: "pack-bundle",
  title: "All 6 Worksheet Packs",
  description: {
    th: "ใบงานครบทั้ง 6 ชุด", // NEW
    en: "All six printable packs in one purchase.",
  },
  pages: null, // sum is shown by the page once every pack has a count
  priceThb: 299, // PLACEHOLDER
  fileKeys: PACK_IDS.flatMap((id) => PACK_OFFERS[id].fileKeys),
  cover: null,
  onSale: false,
  copyConfirmed: false,
};

export const OFFERS: Record<OfferId, Offer> = { ...PACK_OFFERS, bundle: BUNDLE_OFFER };

/** The six packs, in order, then the bundle. */
export const PACK_LIST: Offer[] = PACK_IDS.map((id) => PACK_OFFERS[id]);
export const BUNDLE: Offer = BUNDLE_OFFER;

export function getOffer(id: unknown): Offer | null {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(OFFERS, id)
    ? OFFERS[id as OfferId]
    : null;
}

/**
 * Everything that currently stops this offer being sold. Empty = sellable.
 * The server refuses to create a Checkout session unless this is empty.
 *
 * `shopEnabled` is a parameter only so unit checks can exercise the other
 * branches; production callers use the default.
 */
export function saleBlockers(offer: Offer, shopEnabled: boolean = SHOP_ENABLED): string[] {
  const out: string[] = [];
  if (!shopEnabled) out.push("shop is switched off (SHOP_ENABLED)");
  if (!offer.onSale) out.push("onSale is false");
  if (!Number.isInteger(offer.priceThb) || offer.priceThb < MIN_PRICE_THB) {
    out.push(`price must be a whole number of baht, at least ${MIN_PRICE_THB}`);
  }
  if (offer.fileKeys.length === 0) out.push("no file key");
  if (offer.pages === null && offer.id !== "bundle") out.push("page count not set");
  if (!offer.copyConfirmed) out.push("description not confirmed against the PDF");
  if (offer.id === "bundle") {
    // A bundle is only as ready as the packs inside it.
    for (const id of PACK_IDS) {
      if (!PACK_OFFERS[id].copyConfirmed || PACK_OFFERS[id].pages === null) {
        out.push(`pack ${id} is not ready, so the bundle is not`);
      }
    }
  }
  return out;
}

export function isSellable(offer: Offer): boolean {
  return saleBlockers(offer).length === 0;
}

/** Human label for each file an offer delivers, in fileKeys order. */
export function fileLabels(offer: Offer): string[] {
  return offer.id === "bundle" ? PACK_LIST.map((p) => p.title) : [offer.title];
}
