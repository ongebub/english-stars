/**
 * Copy for /pack/[id], the page a family lands on after scanning the QR code on
 * a paid worksheet pack.
 *
 * Almost everything is reused and must not be reworded here:
 *   - the trial button and the trial terms (heroCta, heroDisclosure) are the
 *     live strings from ../../LandingContent.tsx. That is a legal statement and
 *     the pages must not disagree, so they are imported, not retyped.
 *   - the "what is inside" list is LandingContent's insideItems.
 *   - the LINE strings are FREE_NEW.lineLead / lineCta from
 *     ../../interview/free/content.ts.
 *
 * No price is printed here that does not come from the imported trial terms.
 * The price of the pack itself is not on this page at all.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  THAI: no native reviewer exists or is planned (Chris, 2026-10-05).
 *
 *  Every string in PACK_NEW was written by Jinx on 2026-10-08. The four Thai
 *  strings are short on purpose and had an independent second read by a
 *  separate model pass on 2026-10-08, which found them fine as written.
 *  Character names stay in Latin script, as they are in the PDF.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { TH as LANDING_TH, EN as LANDING_EN } from "../../LandingContent";
import { FREE_NEW } from "../../interview/free/content";

export { LINE_ADD_FRIEND_URL } from "@/lib/social";

export const PACK_NEW = {
  th: {
    // H1. Thanks, in the voice of the characters' world.
    thanksH1: "ขอบคุณที่ฝึกกับเรา!",
    // One line under the picture.
    thanksSub: "Ollie, Nong-Fah และ Thawan ดีใจที่ได้เจอลูกของคุณ มาเรียนภาษาอังกฤษกับพวกเรากันต่อนะ",
    // Heading over the list of what the app has.
    whatH2: "ในแอปมีมากกว่าใบงาน",
    whatSub: "ลูกของคุณจะได้เจอ Ollie, Nong-Fah และ Thawan ในนิทานและบทเรียนอีกมากมาย",
    // Alt text for the group picture (English in both locales).
    heroAlt: "Nong-Fah, Thawan and Ollie the owl under a mango tree",
  },
  en: {
    thanksH1: "Thank you for practicing with us!",
    thanksSub: "Ollie, Nong-Fah and Thawan are so happy to meet your child. Come and keep playing and learning English with us!",
    whatH2: "The app has more than the worksheets.",
    whatSub: "Your child will meet Ollie, Nong-Fah and Thawan in many more stories and lessons.",
    heroAlt: "Nong-Fah, Thawan and Ollie the owl under a mango tree",
  },
};

export function getPackCopy(lang: "th" | "en") {
  const base = lang === "th" ? LANDING_TH : LANDING_EN;
  return {
    toggle: base.toggle,
    footerPrivacy: base.footerPrivacy,
    footerTerms: base.footerTerms,
    cta: base.heroCta,
    trialTerms: base.heroDisclosure,
    insideItems: base.insideItems,
    lineLead: FREE_NEW[lang].lineLead,
    lineCta: FREE_NEW[lang].lineCta,
    ...PACK_NEW[lang],
  };
}
