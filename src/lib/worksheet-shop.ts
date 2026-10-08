/**
 * The worksheet shop: ONE config file for every pack on /worksheets.
 *
 * ┌─ HOW TO GO ON SALE ───────────────────────────────────────────────────────┐
 * │ Before: the migration in supabase/pending/ is applied, the six PDFs are   │
 * │ in the private bucket at the `fileKeys` below, and the Stripe webhook +   │
 * │ STRIPE_WORKSHEETS_WEBHOOK_SECRET are set in Vercel Production.            │
 * │ Then change ONE line: `export const SHOP_ENABLED = false` -> true.        │
 * │ Every offer's `onSale` follows that line. To hold one pack back, write    │
 * │ `onSale: false` on that pack instead of the shared default.               │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Prices are the real ones Chris set on 2026-10-08. With SHOP_ENABLED false
 * nothing is for sale and no price is shown. The gate is enforced on the
 * server (see `saleBlockers`, used by /api/worksheets/checkout); hiding the
 * button in the page is not the control.
 *
 * Pack ids, titles and the `pack-N` funnel plan come from the shared registry
 * in ./packs.ts, the one the /pack/[id] QR landing already uses. This file adds
 * only what the shop needs on top.
 */
import { PACKS, type PackId } from "@/lib/packs";

/** Master switch. false = the whole shop is off, whatever the packs say. */
export const SHOP_ENABLED = true;

/** Default for every offer's `onSale`. Follows the master switch on purpose. */
const ON_SALE_DEFAULT = SHOP_ENABLED;

/** Private Supabase bucket the PDFs live in (created by the pending migration). */
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
  /** Whole baht. */
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
 * THAI COPY below was written 2026-10-08 and given a careful second read by
 * Jinx (the AI agent), not by a native speaker. Pack 1's Thai is the line
 * printed on its PDF cover, reused as is. Page counts were checked against the
 * finished PDFs; the contents lines were checked against each cover.
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
    priceThb: 89,
    fileKeys: [key(1)],
    cover: "/worksheets/covers/pack-01.jpg",
    onSale: ON_SALE_DEFAULT,
    copyConfirmed: true,
  },
  "2": {
    id: "2",
    plan: PACKS["2"].plan,
    title: PACKS["2"].title,
    description: {
      th: "ฝึกเขียนตัวอักษร ABC เสียงแรกของคำ จับคู่ และโฟนิกส์ พร้อมเกียรติบัตร สำหรับเด็กอนุบาล พิมพ์ที่บ้านได้", // second read: Jinx
      en: "Letter tracing, beginning sounds, matching and phonics, plus a certificate. For K1 to K3. Print at home.",
    },
    pages: 25,
    priceThb: 59,
    fileKeys: [key(2)],
    cover: "/worksheets/covers/pack-02.jpg",
    onSale: ON_SALE_DEFAULT,
    copyConfirmed: true,
  },
  "3": {
    id: "3",
    plan: PACKS["3"].plan,
    title: PACKS["3"].title,
    description: {
      th: "คำศัพท์ภาษาอังกฤษ 100 คำ ใน 9 หัวข้อ ฝึกเขียนตาม จับคู่ วงกลมคำที่ถูก พร้อมบัตรภาพและเกียรติบัตร", // second read: Jinx
      en: "100 first words in 9 themes: tracing, matching, circle the word, picture cards and a certificate.",
    },
    pages: 25,
    priceThb: 59,
    fileKeys: [key(3)],
    cover: "/worksheets/covers/pack-03.jpg",
    onSale: ON_SALE_DEFAULT,
    copyConfirmed: true,
  },
  "4": {
    id: "4",
    plan: PACKS["4"].plan,
    title: PACKS["4"].title,
    description: {
      th: "นิทานภาพสั้น ๆ 8 เรื่องกับ Nong-Fah พร้อมแบบฝึกหัดเช็กความเข้าใจ สมุดบันทึกการอ่าน เฉลย และเกียรติบัตร", // second read: Jinx
      en: "8 short picture stories with Nong-Fah, comprehension exercises, a reading log, answer key and certificate.",
    },
    pages: 24,
    priceThb: 59,
    fileKeys: [key(4)],
    cover: "/worksheets/covers/pack-04.jpg",
    onSale: ON_SALE_DEFAULT,
    copyConfirmed: true,
  },
  "5": {
    id: "5",
    plan: PACKS["5"].plan,
    title: PACKS["5"].title,
    description: {
      th: "แบบทดสอบฝึกทำ 3 ชุด รวม 60 ข้อ เหมือนข้อสอบเข้า ป.1 พร้อมเฉลยและบทพูดสำหรับผู้ปกครอง ต้องพิมพ์สีเท่านั้น", // second read: Jinx
      en: "3 practice tests, 60 questions, in the style of Grade 1 entrance exams, with a parent script and answer key. Needs color printing.",
    },
    pages: 22,
    priceThb: 89,
    fileKeys: [key(5)],
    cover: "/worksheets/covers/pack-05.jpg",
    onSale: ON_SALE_DEFAULT,
    copyConfirmed: true,
  },
  "6": {
    id: "6",
    plan: PACKS["6"].plan,
    title: PACKS["6"].title,
    description: {
      th: "ฝึกลากเส้น นับ ระบายสี จับคู่ และหารูปทรง เรื่องตัวเลข สี และรูปทรง พร้อมเฉลยและเกียรติบัตร", // second read: Jinx
      en: "Trace, count, color, match and find the shapes: numbers, colors and shapes, with answer key and certificate.",
    },
    pages: 26,
    priceThb: 59,
    fileKeys: [key(6)],
    cover: "/worksheets/covers/pack-06.jpg",
    onSale: ON_SALE_DEFAULT,
    copyConfirmed: true,
  },
};

const PACK_IDS = Object.keys(PACK_OFFERS) as PackId[];

const BUNDLE_OFFER: Offer = {
  id: "bundle",
  plan: "pack-bundle",
  title: "All 6 Worksheet Packs",
  description: {
    th: "ใบงานครบทั้ง 6 ชุด รวม 148 หน้า ประหยัดกว่าซื้อแยก 115 บาท (ชุดที่ 5 ต้องพิมพ์สี)", // second read: Jinx
    en: "All six printable packs, 148 pages, in one purchase. Saves 115 baht against buying them separately. Pack 5 needs color printing.",
  },
  pages: 148, // 26+25+25+24+22+26
  priceThb: 299,
  fileKeys: PACK_IDS.flatMap((id) => PACK_OFFERS[id].fileKeys),
  cover: "/worksheets/covers/bundle.jpg",
  onSale: ON_SALE_DEFAULT,
  copyConfirmed: true,
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
