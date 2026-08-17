"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TH, EN } from "./content";
import { trackEvent } from "@/lib/track";

const CONTACT_LINK = "mailto:info@englishallstars.com";

/**
 * /interview — the destination for the interview-questions Facebook ad.
 *
 * WHY THIS PAGE EXISTS, so nobody "simplifies" it later:
 * The ad reached 37,921 people and sent 1,451 of them to the root page. Four
 * clicked a CTA. 0.28%. The ad promises five free interview questions; root
 * sells a 750 THB subscription. The scent broke on arrival.
 *
 * So the hard rule here is: THE FIVE QUESTIONS ARE READABLE IMMEDIATELY. No
 * signup wall, no email gate, no "scroll past the offer first". The hero has
 * deliberately NO call to action. The offer appears only after the value has
 * actually been handed over. If you add a gate above the questions, this page
 * becomes the root page again and there is no point having it.
 */
export default function InterviewContent() {
  const [lang, setLang] = useState<"th" | "en">("th");
  const t = lang === "th" ? TH : EN;
  const isThai = lang === "th";

  const bodyFont = isThai ? "font-sarabun" : "font-nunito";
  const thaiLeading = isThai ? { lineHeight: "1.75" } : undefined;

  useEffect(() => {
    trackEvent("interview_page_viewed");
  }, []);

  // Keep <html lang> in step with the visible locale — same reasoning as the
  // root landing page: a stale lang makes screen readers voice Thai copy with
  // an English synthesiser.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="min-h-screen bg-white font-nunito">
      {/* ── Controls ──────────────────────────────────────────────────────────
          Plain bg-white, NOT bg-white/95. Tailwind emits the latter as the
          class "bg-white\/95", which does not match the html.dark .bg-white
          override in globals.css — so in dark mode the text flipped to light
          while the background stayed white and the controls became invisible
          (1.09:1). This already shipped once on the root page. Do not
          reintroduce an opacity suffix here. */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/login?redirect=/learn"
          className={`bg-white border border-gray-200 shadow-md text-text-dark ${bodyFont} font-bold text-sm px-4 py-2 rounded-full hover:bg-cream transition-colors min-h-[40px] inline-block`}
        >
          {t.login}
        </Link>
      </div>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setLang(isThai ? "en" : "th")}
          className="bg-white border border-gray-200 shadow-md text-text-dark font-nunito font-bold text-sm px-4 py-2 rounded-full hover:bg-cream transition-colors min-h-[40px]"
          aria-label={`Switch to ${t.toggle} language`}
        >
          {t.toggle}
        </button>
      </div>

      {/* ── 1. HERO — headline and subhead only. No CTA. ────────────────────── */}
      {/* Gradient is one step deeper than the root page's
          (#1565C0 -> #0288D1 -> #00BCD4). On that lighter ramp the white
          subhead measured 3.5:1, below AA for 18px text, and the cyan end is
          only 2.3:1 against white. Deepening to #0D47A1 -> #1565C0 -> #0288D1
          keeps the same blue brand family and the same look at a glance, but
          puts the subhead at 5.2:1. This page takes paid traffic on Thai
          mobile in daylight; legibility wins over matching root exactly.
          NOTE: the root page still has the lighter ramp and the same 3.5:1
          subhead — flagged for Chris, not changed here. */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#0288D1] text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-white/[0.05]" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-20 pb-12 sm:pt-24 sm:pb-16 text-center">
          <Image
            src="/logo.png"
            alt="English Allstars"
            width={96}
            height={96}
            priority
            className="mx-auto mb-6 drop-shadow-xl w-20 h-20 sm:w-24 sm:h-24"
          />

          <h1
            className={`${bodyFont} font-black text-3xl sm:text-4xl lg:text-5xl leading-tight mb-5`}
            style={thaiLeading}
          >
            {t.heroH1}
          </h1>

          <p
            className={`${bodyFont} text-base sm:text-lg max-w-xl mx-auto mb-6`}
            style={thaiLeading ?? { lineHeight: "1.6" }}
          >
            {t.heroSub}
          </p>

          {/* Not a CTA — a promise that nothing is being asked of them.
              Solid white pill with dark blue ink (12.0:1) rather than white
              text on bg-white/15, which measured 2.3:1 against the lighter end
              of the hero gradient. */}
          <p
            /* bg-[#FFFFFF], deliberately NOT bg-white. The hero gradient is
               fixed in both themes, so anything sitting on it must not follow
               the dark-mode inversion — and html.dark .bg-white would repaint
               this pill #1F2937, putting dark blue ink on a dark chip (2.21:1).
               The arbitrary-value class is not covered by that override, so the
               pill stays white and the pair measures 6.69:1 in both themes. */
            className={`${bodyFont} inline-block rounded-full bg-[#FFFFFF] text-[#01579B] px-4 py-2 text-sm font-bold`}
          >
            {t.heroBadge}
          </p>
        </div>

        <div className="relative h-12 overflow-hidden">
          <svg viewBox="0 0 1440 64" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" fill="white" />
          </svg>
        </div>
      </header>

      {/* ── 2. THE FIVE QUESTIONS ───────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
        <h2
          className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark text-center mb-8`}
          style={thaiLeading}
        >
          {t.questionsH2}
        </h2>

        <div className="space-y-6">
          {t.questions.map((q, i) => (
            <article
              key={q.question}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="sm:flex sm:items-start">
                {/* Image above the text on mobile, beside it on desktop.
                    The first is eager because on a phone it sits at or near the
                    fold; the rest lazy-load.

                    THE CONTAINER IS SQUARE AND SO IS THE SOURCE, deliberately.
                    This started as a fixed 160px-tall band with object-cover,
                    which showed only the top quarter of the original frame and
                    cut the raised hands clean out of "How old are you?" — the
                    one detail that question's picture exists to show. With a
                    square box and a square source, object-cover crops nothing.
                    If you change either aspect, re-check every frame, not just
                    the first. */}
                <div className="sm:w-44 sm:flex-shrink-0 bg-cream">
                  <Image
                    src={q.image}
                    alt={q.alt}
                    width={640}
                    height={640}
                    loading={i === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 640px) 220px, 176px"
                    className="w-full max-w-[220px] mx-auto aspect-square object-cover object-top sm:max-w-none"
                  />
                </div>

                <div className="p-5 sm:p-6 flex-1">
                  <div className="flex items-baseline gap-2 mb-4">
                    {/* dark: variants throughout this card. The accent inks are
                        tuned for a white surface; in dark mode globals.css
                        darkens the surface but leaves these colours alone, and
                        sky-dark/leaf-dark then measure 3.81:1 and 2.99:1. The
                        lighter shade of the same brand colour restores 7.62:1
                        and 5.65:1. */}
                    <span className="font-nunito font-black text-[#01579B] dark:text-sky text-lg">
                      {i + 1}.
                    </span>
                    <h3 className="font-nunito font-black text-lg sm:text-xl text-text-dark">
                      {q.question}
                    </h3>
                  </div>

                  <p className="rounded-xl bg-leaf/10 px-4 py-3 mb-4">
                    <span className="block font-nunito text-[11px] font-bold uppercase tracking-wide text-[#1B5E20] dark:text-leaf mb-1">
                      {t.labelAnswer}
                    </span>
                    <span className="font-nunito text-base font-bold text-text-dark">
                      {q.answer}
                    </span>
                  </p>

                  <Detail label={t.labelListen} body={q.listen} font={bodyFont} leading={thaiLeading} />
                  <Detail label={t.labelMistake} body={q.mistake} font={bodyFont} leading={thaiLeading} />
                  <Detail label={t.labelPractise} body={q.practise} font={bodyFont} leading={thaiLeading} last />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 3. GENERAL ADVICE ───────────────────────────────────────────────── */}
      <section className="bg-cream py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-8">
            <Image
              src="/logo-small.png"
              alt=""
              aria-hidden="true"
              width={64}
              height={64}
              loading="lazy"
              className="mx-auto mb-4 w-14 h-14"
            />
            <h2
              className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark mb-3`}
              style={thaiLeading}
            >
              {t.adviceH2}
            </h2>
            <p
              className={`${bodyFont} text-text-mid max-w-xl mx-auto`}
              style={thaiLeading}
            >
              {t.adviceIntro}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {t.adviceItems.map((a) => (
              <div key={a.title} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-2xl mb-2" aria-hidden="true">{a.emoji}</div>
                <h3
                  className={`${bodyFont} font-bold text-text-dark mb-1`}
                  style={thaiLeading}
                >
                  {a.title}
                </h3>
                <p
                  className={`${bodyFont} text-sm text-text-mid`}
                  style={thaiLeading}
                >
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. PRINTABLE WORKSHEET (email capture) ──────────────────────────── */}
      <PrintableForm t={t} bodyFont={bodyFont} leading={thaiLeading} />

      {/* ── 5. THE OFFER — only now, after the value has been handed over. ──── */}
      <section className="bg-gradient-to-br from-sky-dark/5 to-leaf/10 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 text-center">
          <h2
            className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark mb-4`}
            style={thaiLeading}
          >
            {t.offerH2}
          </h2>
          <p
            className={`${bodyFont} text-text-mid max-w-xl mx-auto mb-8`}
            style={thaiLeading}
          >
            {t.offerBody}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
            {t.offerItems.map((item) => (
              <div key={item.title} className="rounded-2xl bg-white shadow-sm overflow-hidden">
                <Image
                  src={item.screenshot}
                  alt={item.title}
                  width={400}
                  height={300}
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="w-full h-auto object-cover object-top"
                />
                <div className="p-4">
                  <div className="text-xl mb-1" aria-hidden="true">{item.emoji}</div>
                  <h3
                    className={`${bodyFont} font-bold text-text-dark text-sm mb-1`}
                    style={thaiLeading}
                  >
                    {item.title}
                  </h3>
                  <p className={`${bodyFont} text-xs text-text-mid`} style={thaiLeading}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/signup"
            onClick={() => trackEvent("interview_cta_clicked")}
            className={`${bodyFont} inline-flex items-center justify-center bg-sun text-text-dark font-extrabold text-lg px-8 py-4 rounded-2xl hover:bg-sun-dark transition-colors shadow-lg w-full sm:w-auto text-center min-h-[56px]`}
          >
            {t.offerCta}
          </Link>

          {/* ── 6. TRIAL TERMS, EXPLICIT. The card requirement is stated, not
                 buried — but the no-charge promise leads, because that is the
                 part people get wrong. */}
          {/* bg-white, NOT bg-white/70 — measured at 1.25:1 in dark mode before
              this was changed. Tailwind emits the opacity form as the class
              "bg-white\/70", which the html.dark .bg-white override in
              globals.css does not match, so the box stayed light while its text
              flipped to near-white. Exactly the trap called out at the top of
              this file, walked straight into. Solid bg-white darkens correctly
              with the rest of the page. */}
          <div className="mt-6 rounded-xl bg-white px-5 py-4 max-w-md mx-auto">
            <p className={`${bodyFont} font-bold text-text-dark text-sm`}>
              {t.trialHeadline}
            </p>
            <p
              className={`${bodyFont} text-xs text-text-mid mt-2`}
              style={thaiLeading}
            >
              {t.trialTerms}
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-text-dark text-white/60 text-xs text-center py-6 px-4 space-y-1">
        <p className={bodyFont}>
          {t.contactPrompt}{" "}
          <a href={CONTACT_LINK} className="underline hover:text-white transition-colors">
            {t.contactLink}
          </a>
        </p>
        <p className="font-nunito">© {new Date().getFullYear()} English Allstars</p>
        <p className={bodyFont}>
          <Link href="/privacy" className="hover:text-white transition-colors">
            {t.footerPrivacy}
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-white transition-colors">
            {t.footerTerms}
          </Link>
        </p>
      </footer>
    </div>
  );
}

function Detail({
  label,
  body,
  font,
  leading,
  last,
}: {
  label: string;
  body: string;
  font: string;
  leading?: { lineHeight: string };
  last?: boolean;
}) {
  return (
    <div className={last ? undefined : "mb-3"}>
      {/* text-text-mid, not text-text-light: the light shade measures 2.59:1 on
          white at 11px. These are labels a parent has to read, not decoration. */}
      <p className="font-nunito text-[11px] font-bold uppercase tracking-wide text-text-mid mb-0.5">
        {label}
      </p>
      <p className={`${font} text-sm text-text-mid`} style={leading}>
        {body}
      </p>
    </div>
  );
}

/**
 * Worksheet request form.
 *
 * The PDF is real and is sent by /api/interview/printable — do not turn this
 * into a "coming soon" capture. Collecting addresses with nothing to send is
 * worse than not capturing at all.
 */
function PrintableForm({
  t,
  bodyFont,
  leading,
}: {
  t: typeof TH;
  bodyFont: string;
  leading?: { lineHeight: string };
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;

    // Deliberately loose. Strict client-side email regexes reject valid
    // addresses; the server validates too, and Resend is the real arbiter.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setState("error");
      setMessage(t.printableInvalid);
      return;
    }

    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/interview/printable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale: t.lang }),
      });
      // 503 is the daily send ceiling, not a bad address. Saying "try again"
      // would be wrong — retrying immediately cannot work — and claiming
      // success would send a parent to an inbox that will stay empty.
      if (res.status === 503) {
        setState("error");
        setMessage(t.printableBusy);
        return;
      }
      if (!res.ok) throw new Error("send failed");
      setState("sent");
      setMessage(t.printableSuccess);
      trackEvent("interview_email_submitted");
    } catch {
      setState("error");
      setMessage(t.printableError);
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
      <div className="rounded-2xl border-2 border-dashed border-sky-dark/30 bg-white p-6 sm:p-8 text-center">
        <div className="text-3xl mb-3" aria-hidden="true">🖨️</div>
        <h2
          className={`${bodyFont} font-black text-xl sm:text-2xl text-text-dark mb-3`}
          style={leading}
        >
          {t.printableH2}
        </h2>
        <p
          className={`${bodyFont} text-sm text-text-mid max-w-lg mx-auto mb-6`}
          style={leading}
        >
          {t.printableBody}
        </p>

        {state === "sent" ? (
          <p
            className={`${bodyFont} rounded-xl bg-leaf/15 text-leaf-dark dark:text-leaf font-bold px-5 py-4 max-w-md mx-auto`}
            style={leading}
            role="status"
          >
            {message}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <label htmlFor="printable-email" className="sr-only">
                {t.printablePlaceholder}
              </label>
              <input
                id="printable-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.printablePlaceholder}
                className={`${bodyFont} flex-1 rounded-xl border border-gray-300 bg-white text-text-dark px-4 py-3 min-h-[48px] placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-sky-dark`}
              />
              <button
                type="submit"
                disabled={state === "sending"}
                /* #01579B, not bg-sky-dark. White on sky-dark (#0288D1)
                   measures 3.86:1, which fails AA for 16px text. #01579B
                   measures 6.69:1 and is already used elsewhere as the
                   sky-dark hover shade, so it is not a new colour. */
                className={`${bodyFont} rounded-xl bg-[#01579B] text-white font-bold px-6 py-3 min-h-[48px] hover:bg-[#013E70] transition-colors disabled:opacity-60`}
              >
                {state === "sending" ? t.printableSending : t.printableCta}
              </button>
            </div>

            {state === "error" && (
              <p className={`${bodyFont} text-sm text-coral-dark dark:text-coral mt-3`} role="alert">
                {message}
              </p>
            )}

            {/* This is the data-use notice. It must be legible, so text-text-mid
                rather than the 2.59:1 text-text-light. */}
            <p className={`${bodyFont} text-xs text-text-mid mt-4`} style={leading}>
              {t.printablePrivacy}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
