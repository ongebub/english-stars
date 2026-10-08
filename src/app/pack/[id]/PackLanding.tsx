"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPackCopy, LINE_ADD_FRIEND_URL } from "./content";
import { trackEvent } from "@/lib/track";

/**
 * /pack/[id]. Funnel: pack_scan_viewed -> pack_scan_cta_clicked -> (existing)
 * signup_started. Both pack events carry plan = "pack-<id>"; nothing else in
 * signup_events says which pack. The browser's signup_session id is shared with
 * the later signup_started, so the three join on session_id.
 *
 * Above the fold on a 375x667 phone: the thank-you H1, the picture of Ollie,
 * Nong-Fah and Thawan, one line, the trial button and its terms. LINE is the
 * secondary action just below.
 */
export default function PackLanding({ plan }: { plan: string }) {
  const [lang, setLang] = useState<"th" | "en">("th");
  const t = getPackCopy(lang);
  const isThai = lang === "th";
  const bodyFont = isThai ? "font-sarabun" : "font-nunito";
  const leading = isThai ? { lineHeight: "1.75" } : undefined;

  useEffect(() => {
    trackEvent("pack_scan_viewed", plan);
  }, [plan]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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
          <h1
            className={`${bodyFont} font-black text-[1.7rem] leading-tight mb-3 drop-shadow`}
            style={leading}
          >
            {t.thanksH1}
          </h1>

          <div className="mx-auto w-full max-w-[250px] rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-white">
            <Image
              src="/pack/ollie-nongfah-thawan.jpg"
              alt={t.heroAlt}
              width={500}
              height={500}
              priority
              className="w-full h-auto block"
            />
          </div>

          <p className={`${bodyFont} text-base font-bold mt-3 mb-4 text-text-dark`} style={leading ?? { lineHeight: "1.5" }}>
            {t.thanksSub}
          </p>

          <Link
            href="/signup"
            onClick={() => trackEvent("pack_scan_cta_clicked", plan)}
            className={`${bodyFont} flex items-center justify-center w-full min-h-[56px] rounded-2xl bg-sun text-text-dark font-extrabold text-lg px-6 py-3 shadow-lg`}
          >
            {t.cta}
          </Link>
          {/* Exact trial terms from LandingContent.tsx. */}
          <p className={`${bodyFont} mt-3 text-xs text-text-dark/80`} style={leading}>
            {t.trialTerms}
          </p>
        </div>
      </header>

      <section className="max-w-md mx-auto px-5 pt-6 text-center">
        <p className={`${bodyFont} font-bold text-text-dark mb-3`} style={leading}>{t.lineLead}</p>
        <a
          href={LINE_ADD_FRIEND_URL}
          target="_blank"
          rel="noopener"
          onClick={() => trackEvent("pack_scan_line_clicked", plan)}
          className={`${bodyFont} flex items-center justify-center w-full min-h-[56px] rounded-2xl bg-[#06C755] text-white font-extrabold text-lg px-6 py-3`}
        >
          {t.lineCta}
        </a>
      </section>

      <section className="max-w-md mx-auto px-5 py-8">
        <h2 className={`${bodyFont} font-black text-2xl text-text-dark text-center mb-2`} style={leading}>
          {t.whatH2}
        </h2>
        <p className={`${bodyFont} text-sm text-text-mid text-center mb-5`} style={leading}>
          {t.whatSub}
        </p>
        <ul className="space-y-3">
          {t.insideItems.map((item, i) => {
            const tints = ["bg-sky/20", "bg-leaf/20", "bg-sun/30", "bg-coral/20", "bg-purple/20"];
            return (
              <li key={item.title} className={`flex items-start gap-3 rounded-2xl p-4 ${tints[i % tints.length]}`}>
                <span className="text-3xl leading-none" aria-hidden="true">{item.emoji}</span>
                <div>
                  <p className={`${bodyFont} font-extrabold text-text-dark`} style={leading}>{item.title}</p>
                  <p className={`${bodyFont} text-sm text-text-mid`} style={leading}>{item.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <Link
          href="/signup"
          onClick={() => trackEvent("pack_scan_cta_clicked", plan)}
          className={`${bodyFont} mt-6 flex items-center justify-center w-full min-h-[56px] rounded-2xl bg-sun text-text-dark font-extrabold text-lg px-6 py-3 shadow-md`}
        >
          {t.cta}
        </Link>
        <p className={`${bodyFont} mt-3 text-xs text-text-mid text-center`} style={leading}>
          {t.trialTerms}
        </p>
      </section>

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
