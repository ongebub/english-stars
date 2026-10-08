"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getShopCopy } from "../content";

export type ThanksLink = { label: string; href: string };

export default function ThanksView({ state, links }: { state: "ok" | "pending" | "notfound"; links: ThanksLink[] }) {
  const [lang, setLang] = useState<"th" | "en">("th");
  const t = getShopCopy(lang);
  const isThai = lang === "th";
  const bodyFont = isThai ? "font-sarabun" : "font-nunito";
  const leading = isThai ? { lineHeight: "1.75" } : undefined;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const heading = state === "ok" ? t.thanksH1 : state === "pending" ? t.pendingH1 : t.notFound;

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
      <main className="max-w-md mx-auto px-5 pt-16 pb-10 text-center">
        <Image src="/pack/ollie-nongfah-thawan.jpg" alt="" width={200} height={200} className="mx-auto w-40 h-40 rounded-3xl border-4 border-white shadow-md" />
        <h1 className={`${bodyFont} font-black text-2xl text-text-dark mt-2 mb-2`} style={leading}>
          {heading}
        </h1>
        {state === "ok" && (
          <>
            <p className={`${bodyFont} text-text-mid mb-5`} style={leading}>{t.thanksSub}</p>
            <ul className="space-y-4">
              {links.map((l) => (
                <li key={l.href} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="font-nunito font-extrabold text-text-dark mb-2">{l.label}</p>
                  <a
                    href={l.href}
                    className={`${bodyFont} flex items-center justify-center min-h-[52px] rounded-2xl bg-sun text-text-dark font-extrabold text-lg px-6 py-3`}
                  >
                    {t.download}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
        {state === "pending" && <p className={`${bodyFont} text-text-mid`} style={leading}>{t.pendingSub}</p>}
        <Link href="/worksheets" className={`${bodyFont} inline-block mt-6 text-sm font-bold text-text-dark underline`}>
          {t.back}
        </Link>
      </main>
    </div>
  );
}
