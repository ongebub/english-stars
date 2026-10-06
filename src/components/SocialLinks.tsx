import { LINE_ADD_FRIEND_URL, FACEBOOK_URL, TIKTOK_URL } from "@/lib/social";

const LINKS = [
  { label: "LINE", href: LINE_ADD_FRIEND_URL },
  { label: "Facebook", href: FACEBOOK_URL },
  { label: "TikTok", href: TIKTOK_URL },
];

/** Outbound social links for public marketing-page footers only (not the children's app). */
export function SocialLinks() {
  return (
    <nav aria-label="Social" className="font-nunito flex items-center justify-center flex-wrap gap-x-2">
      {LINKS.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 hover:text-white transition-colors"
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}
