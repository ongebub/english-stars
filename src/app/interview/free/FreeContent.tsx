"use client";

import { SocialLinks } from "@/components/SocialLinks";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getFreeCopy, LINE_ADD_FRIEND_URL } from "./content";
import { trackEvent } from "@/lib/track";

/**
 * /interview/free. Funnel: free_pack_viewed -> free_pack_requested ->
 * signup_started.
 *
 * Above the fold: the ad's H1, one line, an email field, one button. No price,
 * no card mention. The five questions appear on the page the moment the email
 * request is accepted; the email (the existing worksheet PDF) is a bonus and a
 * failed send never hides the questions.
 */
export default function FreeContent() {
  const [lang, setLang] = useState<"th" | "en">("th");
  const t = getFreeCopy(lang);
  const isThai = lang === "th";
  const bodyFont = isThai ? "font-sarabun" : "font-nunito";
  const leading = isThai ? { lineHeight: "1.75" } : undefined;

  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "unlocked">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    trackEvent("free_pack_viewed");
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state !== "idle") return;
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t.printableInvalid);
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/interview/printable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale: lang, source: "free_pack" }),
      });
      if (res.ok) {
        setEmailSent(true);
        trackEvent("free_pack_requested");
      } else {
        // 503 = daily send ceiling, 500 = capture or send failed. Either way
        // the visitor came for the questions, so they get them.
        setNotice(res.status === 503 ? t.printableBusy : t.emailFailed);
      }
    } catch {
      setNotice(t.emailFailed);
    }
    setState("unlocked");
    // Bring the questions into view on a phone.
    setTimeout(() => document.getElementById("questions")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="min-h-screen bg-white font-nunito">
      <div className="fixed top-3 right-3 z-50">
        <button
          onClick={() => setLang(isThai ? "en" : "th")}
          className="bg-white border border-gray-200 shadow-md text-text-dark font-nunito font-bold text-sm px-4 py-2 rounded-full min-h-[40px]"
          aria-label={`Switch to ${t.toggle} language`}
        >
          {t.toggle}
        </button>
      </div>

      <header className="bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#0288D1] text-white">
        <div className="max-w-xl mx-auto px-5 pt-14 pb-8 text-center">
          <Image src="/logo.png" alt="English Allstars" width={64} height={64} priority className="mx-auto mb-3 w-14 h-14" />
          <h1 className={`${bodyFont} font-black text-2xl leading-tight mb-3`} style={leading}>
            {t.heroH1}
          </h1>
          <p className={`${bodyFont} text-base mb-5`} style={leading ?? { lineHeight: "1.6" }}>
            {t.sub}
          </p>

          {state !== "unlocked" ? (
            <form onSubmit={onSubmit} noValidate className="space-y-3">
              <label htmlFor="free-email" className="sr-only">
                {t.printablePlaceholder}
              </label>
              <input
                id="free-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t.printablePlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${bodyFont} w-full rounded-xl px-4 py-3 text-base text-[#212121] bg-[#FFFFFF] min-h-[52px]`}
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className={`${bodyFont} w-full rounded-xl bg-sun text-text-dark font-extrabold text-lg min-h-[56px] disabled:opacity-60`}
              >
                {state === "sending" ? t.printableSending : t.cta}
              </button>
              {error && (
                <p role="alert" className={`${bodyFont} rounded-lg bg-[#FFFFFF] text-[#B71C1C] text-sm font-bold px-3 py-2`}>
                  {error}
                </p>
              )}
              <p className={`${bodyFont} text-xs opacity-90`} style={leading}>
                {t.printablePrivacy}
              </p>
            </form>
          ) : (
            <p className={`${bodyFont} rounded-xl bg-[#FFFFFF] text-[#01579B] font-bold px-4 py-3`} style={leading}>
              {emailSent ? t.printableSuccess : notice}
            </p>
          )}
        </div>
      </header>

      {state === "unlocked" && (
        <>
          <section id="questions" className="max-w-xl mx-auto px-5 py-8 scroll-mt-4">
            <h2 className={`${bodyFont} font-black text-2xl text-text-dark text-center mb-6`} style={leading}>
              {t.resultH2}
            </h2>
            <div className="space-y-5">
              {t.questions.map((q, i) => (
                <article key={q.question} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                  <p className="font-nunito text-xs font-bold uppercase tracking-wide text-text-mid">{i + 1} / 5</p>
                  <h3 className="font-nunito font-black text-xl text-text-dark mb-3">{q.question}</h3>
                  <p className={`${bodyFont} text-xs font-bold text-text-mid`}>{t.labelAnswer}</p>
                  <p className="font-nunito font-bold text-text-dark mb-3">{q.answer}</p>
                  <p className={`${bodyFont} text-xs font-bold text-text-mid`}>{t.labelListen}</p>
                  <p className={`${bodyFont} text-sm text-text-mid mb-3`} style={leading}>{q.listen}</p>
                  <p className={`${bodyFont} text-xs font-bold text-text-mid`}>{t.labelPractise}</p>
                  <p className={`${bodyFont} text-sm text-text-mid`} style={leading}>{q.practise}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className={`${bodyFont} font-bold text-text-dark mb-3`} style={leading}>{t.lineLead}</p>
              <a
                href={LINE_ADD_FRIEND_URL}
                target="_blank"
                rel="noopener"
                onClick={() => trackEvent("free_pack_line_clicked")}
                className={`${bodyFont} inline-flex items-center justify-center w-full min-h-[56px] rounded-2xl bg-[#06C755] text-white font-extrabold text-lg px-6 py-4`}
              >
                {t.lineCta}
              </a>
            </div>
          </section>

          {/* Soft CTA, after the value. Terms are TH/EN.trialTerms from
              ../content.ts, which is verbatim from LandingContent.tsx. */}
          <section className="bg-gradient-to-br from-sky-dark/5 to-leaf/10 py-8">
            <div className="max-w-xl mx-auto px-5 text-center">
              <h2 className={`${bodyFont} font-black text-xl text-text-dark mb-4`} style={leading}>
                {t.offerH2}
              </h2>
              <Link
                href="/signup"
                className={`${bodyFont} inline-flex items-center justify-center bg-sun text-text-dark font-extrabold text-lg px-6 py-4 rounded-2xl w-full min-h-[56px]`}
              >
                {t.offerCta}
              </Link>
              <div className="mt-5 rounded-xl bg-white px-5 py-4 text-left">
                <p className={`${bodyFont} font-bold text-text-dark text-sm`}>{t.trialHeadline}</p>
                <p className={`${bodyFont} text-xs text-text-mid mt-2`} style={leading}>{t.trialTerms}</p>
              </div>
            </div>
          </section>
        </>
      )}

      <footer className="bg-text-dark text-white/60 text-xs text-center py-6 px-4 space-y-1">
        <p className={bodyFont}>
          {t.contactPrompt} <a href="mailto:info@englishallstars.com" className="underline">{t.contactLink}</a>
        </p>
        <p className={bodyFont}>
          <Link href="/privacy">{t.footerPrivacy}</Link>
          {" · "}
          <Link href="/terms">{t.footerTerms}</Link>
        </p>
        <SocialLinks />
      </footer>
    </div>
  );
}
