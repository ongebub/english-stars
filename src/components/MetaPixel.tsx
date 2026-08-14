"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID, isExcludedPath, pixelPageView } from "@/lib/analytics";

/**
 * Meta Pixel loader + App Router PageView tracking.
 *
 * The base snippet fires PageView once on load. App Router client-side
 * navigation does not re-run it, so we fire PageView on every pathname change.
 *
 * Nothing loads or fires on /admin or /punchlist.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const initialLoad = useRef(true);

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    // The inline snippet already sent the first PageView.
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }
    pixelPageView(pathname);
  }, [pathname]);

  if (!META_PIXEL_ID) return null;
  if (isExcludedPath(pathname)) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
