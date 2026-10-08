import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPack, PACKS } from "@/lib/packs";
import PackLanding from "./PackLanding";

// For people who scanned the QR code on a paid worksheet pack. Not for search.
export const metadata: Metadata = {
  title: "English Allstars",
  robots: { index: false, follow: false },
};

export const dynamicParams = true;

export function generateStaticParams() {
  return Object.keys(PACKS).map((id) => ({ id }));
}

/**
 * No logged-in redirect: a parent who is already a member still scanned this
 * code and should see the page, and the scan should be counted.
 *
 * An unknown id goes to the home page rather than a 404, because the person
 * holding the phone just paid for a PDF and a dead end is the worst outcome.
 */
export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = getPack(id);
  if (!pack) redirect("/");
  return <PackLanding plan={pack.plan} />;
}
