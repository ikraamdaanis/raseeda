import { APP_NAME } from "~/consts/app";

// The homepage's picture of a finished invoice: a real PDF, rendered
// by scripts/render-homepage-invoices.tsx at PDF_RENDER_SCALE times the page's
// CSS pixel size. Crops are in the page's CSS pixels (793.7 x 1122.5).

export const PDF_RENDER_SCALE = 3;

// The hero's invoice, named in the editor toolbar around its render.
export const HERO_INVOICE_NUMBER = "INV-0043";

export const PDF_RENDERS = {
  // The whole page: the desktop hero shows its top, the phone crop runs further
  // down on narrow screens. It displays no wider than the page's CSS width, so
  // it ships at about twice that rather than the full render scale.
  hero: {
    src: "/home/invoice-hero.webp",
    alt: `A ${APP_NAME} invoice from Marlow Studio in Brooklyn to Fernhill Press in Portland, listing editorial illustrations and cover artwork`,
    crop: { x: 0, y: 0, width: 793.7, height: 1122.5 },
    width: 1600
  }
};
