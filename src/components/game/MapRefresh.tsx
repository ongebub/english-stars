"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The browser keeps a copy of pages it has shown (about 30 s for links and router.push,
 * indefinitely for the Back button). Without this, a child who finishes a castle and
 * returns to the map by any route could be shown the pre-completion map until a hard
 * reload. Asking the server for the map again on arrival, and when the browser restores
 * the page from its back/forward cache, makes the map always reflect current progress.
 */
export function MapRefresh() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) router.refresh(); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [router]);
  return null;
}
