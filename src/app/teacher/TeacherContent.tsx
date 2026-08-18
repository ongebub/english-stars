"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TH, EN } from "./content";
import { trackEvent } from "@/lib/track";

/** Set once Chris supplies IMG_1905. See the note on PhotoSlot below. */
const PHOTO_SRC: string | null = null;

/**
 * /teacher — single-screen landing page.
 *
 * HARD CONSTRAINT: NO SCROLL. Everything fits one phone screen, verified at
 * 375x667 (iPhone SE), the smallest realistic viewport.
 *
 * That constraint drives the whole file, so before you add anything:
 *   - The page is a flex column pinned to 100dvh with overflow hidden. Adding a
 *     section does not push content below the fold, it CROPS it. There is no
 *     scrollbar to rescue you and nothing will look broken in a desktop browser.
 *   - Re-verify at 375x667 after any copy change. Thai wraps differently from
 *     English and the Thai is the default locale.
 *   - If it stops fitting, CUT COPY. Do not shrink text below legibility — that
 *     is explicit in the spec, and this page's whole job is to be read by a
 *     parent on a phone.
 *
 * 100dvh rather than 100vh on purpose: on mobile Safari 100vh is the viewport
 * WITHOUT the browser chrome, so a 100vh layout is silently taller than the
 * visible area and the bottom — which here is the CTA and the trial terms —
 * sits under the address bar.
 */
export default function TeacherContent() {
  const [lang, setLang] = useState<"th" | "en">("th");
  const t = lang === "th" ? TH : EN;
  const isThai = lang === "th";
  const bodyFont = isThai ? "font-sarabun" : "font-nunito";

  useEffect(() => {
    trackEvent("teacher_page_viewed");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="h-[100dvh] overflow-hidden bg-white flex flex-col">
      {/* Language toggle. Plain bg-white, never bg-white/nn — the opacity form
          is emitted as a class the html.dark override does not match, which is
          how the header controls once shipped at 1.09:1. */}
      <button
        onClick={() => setLang(isThai ? "en" : "th")}
        aria-label={`Switch to ${t.toggle} language`}
        className="absolute top-3 right-3 z-50 bg-white border border-gray-200 shadow-md text-text-dark font-nunito font-bold text-xs px-3 py-1.5 rounded-full min-h-[32px]"
      >
        {t.toggle}
      </button>

      {/* ── 1. Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 pt-3 pb-2 flex justify-center">
        <Image
          src="/logo-small.png"
          alt="English Allstars"
          width={40}
          height={40}
          priority
          className="w-9 h-9"
        />
      </div>

      {/* ── 2. Photo ────────────────────────────────────────────────────────── */}
      <PhotoSlot alt={t.photoAlt} />

      {/* ── 3-6. Copy block. min-h-0 lets this shrink rather than overflow. ─── */}
      <div className="flex-1 min-h-0 flex flex-col justify-center px-5 pb-4 pt-3">
        <h1
          className={`${bodyFont} font-black text-text-dark text-[17px] leading-snug text-center mb-3`}
          style={isThai ? { lineHeight: "1.45" } : undefined}
        >
          {t.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <div className="space-y-1.5 mb-4">
          {t.bio.map((para) => (
            <p
              key={para}
              className={`${bodyFont} text-text-mid text-[12.5px] text-center`}
              style={{ lineHeight: isThai ? "1.6" : "1.45" }}
            >
              {para}
            </p>
          ))}
        </div>

        <Link
          href="/signup"
          onClick={() => trackEvent("teacher_cta_clicked")}
          className={`${bodyFont} block w-full bg-sun text-text-dark font-extrabold text-base text-center px-6 py-3.5 rounded-2xl shadow-lg min-h-[52px] leading-tight`}
        >
          {t.cta}
        </Link>

        {/* Explicitly NOT fine print — the spec calls for small but legible.
            12.5px, matching the bio, rather than the 11.5px this started at:
            measurement showed 32-45px of spare vertical room depending on
            locale, so there was no reason to shrink the one line that states
            the customer can cancel without being charged. */}
        <p
          className={`${bodyFont} text-text-mid text-[12.5px] text-center mt-2.5 leading-snug`}
        >
          {t.terms}
        </p>
      </div>
    </div>
  );
}

/**
 * The photo slot.
 *
 * Fixed 16:9 box, so its rendered height is a function of the viewport width
 * and NOT of whatever file eventually lands here. That is what makes the
 * no-scroll layout verifiable before the photo exists.
 *
 * IMG_1905 has not been supplied yet (task 6b823e8c). When it is:
 *   - crop to 16:9 centred on Matt and the whiteboard
 *   - the whiteboard text MUST stay legible — his handwriting and the English
 *     homework on it are what make the photo credible, and are the entire
 *     reason this page works. Do not crop them out.
 *   - do not crop so tight the students disappear
 *   - set PHOTO_SRC above; the layout does not need to change
 *
 * SEPARATELY BLOCKED: the whiteboard shows Matt's FULL SURNAME legibly, and he
 * previously approved first name only. Consent for the surname to appear in
 * PAID ADVERTISING is unconfirmed. Do not ship the real photo until that is
 * settled in writing.
 */
function PhotoSlot({ alt }: { alt: string }) {
  if (!PHOTO_SRC) {
    return (
      <div className="flex-shrink-0 w-full aspect-video bg-cream border-y border-gray-200 flex items-center justify-center px-6">
        <p className="font-nunito text-[11px] text-text-mid text-center leading-snug">
          Photo pending — IMG_1905, 16:9, whiteboard text must stay legible.
          <br />
          Surname consent unconfirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-full aspect-video relative">
      <Image src={PHOTO_SRC} alt={alt} fill priority className="object-cover" sizes="100vw" />
    </div>
  );
}
