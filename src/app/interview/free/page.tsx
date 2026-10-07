import type { Metadata } from "next";
import FreeContent from "./FreeContent";

const TITLE = "5 คำถามที่เด็กมักเจอในการสอบสัมภาษณ์เข้าโรงเรียน | English Allstars";

export const metadata: Metadata = {
  title: TITLE,
  // Opened to indexing on 2026-10-06 on Chris's decision. The Thai here has
  // still not been reviewed by a native speaker (see ./content.ts).
};

/** No logged-in redirect, for the same reason as /interview: this is an ad destination. */
export default function FreePage() {
  return <FreeContent />;
}
