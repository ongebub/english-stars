import type { Metadata } from "next";
import WorksheetShop, { type ShopOffer } from "./WorksheetShop";
import { BUNDLE, PACK_LIST, SHOP_ENABLED, isSellable, type Offer } from "@/lib/worksheet-shop";

// Nothing about this page is indexable until the shop is actually open.
export const metadata: Metadata = {
  title: "English Allstars Worksheets",
  robots: SHOP_ENABLED ? { index: true, follow: true } : { index: false, follow: false },
};

// Prices and sale flags are build-time config; `sellable` is computed on the server.
function toShopOffer(o: Offer): ShopOffer {
  return {
    id: o.id,
    plan: o.plan,
    title: o.title,
    description: o.description,
    pages: o.pages,
    priceThb: o.priceThb,
    cover: o.cover,
    sellable: isSellable(o),
  };
}

export default function WorksheetsPage() {
  return <WorksheetShop packs={PACK_LIST.map(toShopOffer)} bundle={toShopOffer(BUNDLE)} />;
}
