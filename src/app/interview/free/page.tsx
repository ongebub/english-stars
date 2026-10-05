import type { Metadata } from "next";
import FreeContent from "./FreeContent";

const TITLE = "5 คำถามที่เด็กมักเจอในการสอบสัมภาษณ์เข้าโรงเรียน | English Allstars";

export const metadata: Metadata = {
  title: TITLE,
  // Same reasoning as ../page.tsx: the Thai here is unapproved (see ./content.ts),
  // so keep it out of Google until Naparat has signed it off. Ad traffic is
  // unaffected. Remove this line when the copy is approved.
  robots: { index: false, follow: true },
};

/** No logged-in redirect, for the same reason as /interview: this is an ad destination. */
export default function FreePage() {
  return <FreeContent />;
}
