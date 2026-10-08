"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getShopCopy } from "./content";
import { trackEvent } from "@/lib/track";
import { type Offer, type OfferId } from "@/lib/worksheet-shop";

/**
 * The shop is handed plain data by the server page, including `sellable`, which
 * the server computed from saleBlockers(). The client never decides whether a
 * pack is for sale; and even if it clicked anyway, /api/worksheets/checkout
 * re-checks and answers 403.
 */
export type ShopOffer = Pick<Offer, "id" | "plan" | "title" | "description" | "pages" | "priceThb" | "cover"> & {
  sellable: boolean;
};

const TINTS = ["bg-sky/20", "bg-leaf/20", "bg-sun/30", "bg-coral/20", "bg-purple/20", "bg-sky/20"];

export default function WorksheetShop({ packs, bundle }: { packs: ShopOffer[]; bundle: ShopOffer }) {
  const [lang, setLang] = useState<"th" | "en">("th");
  const [busy, setBusy] = useState<OfferId | null>(null);
  const [failed, setFailed] = useState(false);
  const t = getShopCopy(lang);
  const isThai = lang === "th";
  const bodyFont = isThai ? "font-sarabun" : "font-nunito";
  const leading = isThai ? { lineHeight: "1.75" } : undefined;

  useEffect(() => {
    trackEvent("worksheets_viewed", "pack-shop");
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  async function buy(o: ShopOffer) {
    if (!o.sellable || busy) return;
    setFailed(false);
    setBusy(o.id);
    trackEvent("worksheet_buy_clicked", o.plan);
    try {
      const res = await fetch("/api/worksheets/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer: o.id, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error("checkout");
      window.location.href = data.url;
    } catch {
      setFailed(true);
      setBusy(null);
    }
  }

  function renderCard(o: ShopOffer, tint: string, featured?: boolean) {
    const pagesNum = o.pages;
    return (
      <li
        key={o.id}
        className={`rounded-3xl p-4 flex flex-col ${featured ? "bg-sun/40 border-4 border-sun" : tint} shadow-sm`}
      >
        <div className="relative mx-auto w-full max-w-[220px] aspect-[1191/1685] rounded-2xl overflow-hidden border-4 border-white shadow-md bg-white">
          {o.cover ? (
            <Image src={o.cover} alt={o.title} fill sizes="220px" className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-cream p-3 text-center font-fredoka text-text-dark text-lg leading-tight">
              {o.title}
            </div>
          )}
          {featured && (
            <span className={`${bodyFont} absolute top-2 left-2 bg-coral text-white text-xs font-extrabold rounded-full px-3 py-1`}>
              {t.bundleBadge}
            </span>
          )}
        </div>

        <h2 className="font-nunito font-extrabold text-text-dark text-lg leading-snug mt-3">{o.title}</h2>
        <p className={`${bodyFont} text-sm text-text-mid mt-1 flex-1`} style={leading}>
          {o.description[lang]}
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className={`${bodyFont} text-xs font-bold text-text-mid`}>
            {pagesNum !== null ? t.pages(pagesNum) : ""}
          </span>
          {/* A price is shown only when the pack can actually be bought. */}
          {o.sellable && <span className="font-fredoka text-2xl text-text-dark">฿{o.priceThb}</span>}
        </div>
        <button
          type="button"
          onClick={() => buy(o)}
          disabled={!o.sellable || busy !== null}
          className={`${bodyFont} mt-3 flex items-center justify-center w-full min-h-[52px] rounded-2xl font-extrabold text-lg px-6 py-3 shadow-md ${
            o.sellable ? "bg-sun text-text-dark disabled:opacity-60" : "bg-white/70 text-text-light cursor-not-allowed shadow-none"
          }`}
        >
          {!o.sellable ? t.soon : busy === o.id ? t.opening : t.buy}
        </button>
      </li>
    );
  }

  return (
    <div className="min-h-screen bg-cream font-nunito">
      <div className="fixed top-3 right-3 z-50">
        <button
          onClick={() => setLang(isThai ? "en" : "th")}
          className="bg-white border border-gray-200 shadow-md text-text-dark font-nunito font-bold text-sm px-4 py-2 rounded-full min-h-[40px]"
          aria-label={`Switch to ${t.toggle} language`}
        >
          {t.toggle}
        </button>
      </div>

      <header className="relative overflow-hidden bg-gradient-to-b from-[#0288D1] via-[#4FC3F7] to-[#B3E5FC] text-white">
        <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full bg-sun/40" />
        <div className="pointer-events-none absolute top-40 -right-12 w-32 h-32 rounded-full bg-white/20" />
        <div className="relative max-w-md mx-auto px-5 pt-14 pb-6 text-center">
          <h1 className={`${bodyFont} font-black text-[1.7rem] leading-tight mb-3 drop-shadow`} style={leading}>
            {t.h1}
          </h1>
          <div className="mx-auto w-full max-w-[200px] rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-white">
            <Image
              src="/pack/ollie-nongfah-thawan.jpg"
              alt="Nong-Fah, Thawan and Ollie the owl under a mango tree"
              width={400}
              height={400}
              priority
              className="w-full h-auto block"
            />
          </div>
          <p className={`${bodyFont} text-base font-bold mt-3 text-text-dark`} style={leading ?? { lineHeight: "1.5" }}>
            {t.sub}
          </p>
        </div>
      </header>

      <main className="max-w-md sm:max-w-3xl mx-auto px-5 py-6">
        {failed && (
          <p role="alert" className={`${bodyFont} mb-4 rounded-2xl bg-coral/20 text-text-dark text-sm font-bold p-3 text-center`}>
            {t.error}
          </p>
        )}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {packs.map((p, i) => renderCard(p, TINTS[i % TINTS.length], false))}
          {renderCard(bundle, "", true)}
        </ul>
        <p className={`${bodyFont} mt-5 text-xs text-text-mid text-center`} style={leading}>
          {t.delivery}
        </p>

        <section className="mt-8 rounded-3xl bg-white p-5 text-center shadow-sm">
          <Link
            href="/signup"
            className={`${bodyFont} flex items-center justify-center w-full min-h-[52px] rounded-2xl bg-leaf text-white font-extrabold text-lg px-6 py-3`}
          >
            {t.trialCta}
          </Link>
          {/* Exact trial terms from LandingContent.tsx. */}
          <p className={`${bodyFont} mt-3 text-xs text-text-mid`} style={leading}>
            {t.trialTerms}
          </p>
        </section>
      </main>

      <footer className="bg-text-dark text-white/60 text-xs text-center py-6 px-4">
        <p className={bodyFont}>
          <Link href="/privacy">{t.footerPrivacy}</Link>
          {" · "}
          <Link href="/terms">{t.footerTerms}</Link>
        </p>
      </footer>
    </div>
  );
}
