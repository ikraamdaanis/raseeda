import type { InvoiceFontDefinition } from "~/consts/invoice-fonts";
import type { InvoiceFont } from "~/types";

// The homepage shows the invoice fonts only as a word in the font demo and
// "Aa" in the hero's inspector, so it sets them in previews cut down to those
// letters (scripts/subset-preview-fonts.ts, @font-face in
// styles/home-demos.css) instead of downloading every full font. Change
// either text and re-run `bun run subset:preview-fonts`, or the missing
// letters fall back to another face.
export const FONT_DEMO_WORD = "Invoice";

export const FONT_SWATCH_TEXT = "Aa";

export const HOME_PREVIEW_FONT_TEXT = `${FONT_DEMO_WORD}${FONT_SWATCH_TEXT}`;

// Geist and Geist Mono have none: the homepage loads them in full for its
// own text, so their previews use the real faces.
const HOME_PREVIEW_FONT_CLASSES: Partial<Record<InvoiceFont, string>> = {
  inter: "font-preview-inter",
  "dm-sans": "font-preview-dm-sans",
  "ibm-plex-sans": "font-preview-ibm-plex-sans",
  "bricolage-grotesque": "font-preview-bricolage-grotesque",
  lora: "font-preview-lora",
  "libre-baskerville": "font-preview-libre-baskerville",
  "jetbrains-mono": "font-preview-jetbrains-mono",
  "ibm-plex-mono": "font-preview-ibm-plex-mono"
};

export function getHomePreviewFontClass(font: InvoiceFontDefinition) {
  return HOME_PREVIEW_FONT_CLASSES[font.id] ?? font.previewClassName;
}
