import type { Metadata } from "next";
import FreeContent from "./FreeContent";

const TITLE = "5 คำถามที่เด็กมักเจอในการสอบสัมภาษณ์เข้าโรงเรียน | English Allstars";

export const metadata: Metadata = {
  title: TITLE,
  // The Thai here has had no native-speaker review (see ./content.ts), so keep
  // it out of Google. Ad traffic is unaffected.
  robots: { index: false, follow: true },
};

/** No logged-in redirect, for the same reason as /interview: this is an ad destination. */
export default function FreePage() {
  return <FreeContent />;
}
