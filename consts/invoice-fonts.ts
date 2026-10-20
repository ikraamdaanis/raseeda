import type { InvoiceFont } from "~/types";
import type { FontWeight } from "~/utils/get-font-weight";

export type InvoiceFontCategory = "sans-serif" | "serif" | "monospace";

/** Tighter tracking for monospace faces on invoices. */
export const MONOSPACE_LETTER_SPACING = "-0.04em";

export interface InvoiceFontDefinition {
  id: InvoiceFont;
  name: string;
  category: InvoiceFontCategory;
  cssFamily: string;
  pdfFamily: string;
  previewClassName: string;
  weights: FontWeight[];
  letterSpacing?: string;
}

export const FONT_WEIGHT_OPTIONS: {
  value: FontWeight;
  label: string;
  className: string;
}[] = [
  { value: "Normal", label: "Regular", className: "font-normal" },
  { value: "Medium", label: "Medium", className: "font-medium" },
  { value: "Semibold", label: "Semibold", className: "font-semibold" },
  { value: "Bold", label: "Bold", className: "font-bold" }
];

const STANDARD_WEIGHTS: FontWeight[] = ["Normal", "Medium", "Semibold", "Bold"];

export const INVOICE_FONTS: InvoiceFontDefinition[] = [
  {
    id: "schibsted-grotesk",
    name: "Schibsted Grotesk",
    category: "sans-serif",
    cssFamily:
      '"Schibsted Grotesk Variable", "Schibsted Grotesk Fallback", sans-serif',
    pdfFamily: "Invoice Schibsted Grotesk",
    previewClassName: "font-schibsted-grotesk",
    weights: STANDARD_WEIGHTS
  },
  {
    id: "geist",
    name: "Geist",
    category: "sans-serif",
    cssFamily: '"Geist Variable", "Geist Fallback", sans-serif',
    pdfFamily: "Invoice Geist",
    previewClassName: "font-geist",
    weights: STANDARD_WEIGHTS
  },
  {
    id: "inter",
    name: "Inter",
    category: "sans-serif",
    cssFamily: '"Inter Variable", "Inter Fallback", sans-serif',
    pdfFamily: "Invoice Inter",
    previewClassName: "font-inter",
    weights: STANDARD_WEIGHTS
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    category: "sans-serif",
    cssFamily: '"DM Sans Variable", sans-serif',
    pdfFamily: "Invoice DM Sans",
    previewClassName: "font-dm-sans",
    weights: STANDARD_WEIGHTS
  },
  {
    id: "ibm-plex-sans",
    name: "IBM Plex Sans",
    category: "sans-serif",
    cssFamily: '"IBM Plex Sans Variable", sans-serif',
    pdfFamily: "Invoice IBM Plex Sans",
    previewClassName: "font-ibm-plex-sans",
    weights: STANDARD_WEIGHTS
  },
  {
    id: "bricolage-grotesque",
    name: "Bricolage Grotesque",
    category: "sans-serif",
    cssFamily: '"Bricolage Grotesque Variable", sans-serif',
    pdfFamily: "Invoice Bricolage Grotesque",
    previewClassName: "font-bricolage-grotesque",
    weights: STANDARD_WEIGHTS
  },
  {
    id: "lora",
    name: "Lora",
    category: "serif",
    cssFamily: '"Lora Variable", serif',
    pdfFamily: "Invoice Lora",
    previewClassName: "font-lora",
    weights: STANDARD_WEIGHTS
  },
  {
    id: "libre-baskerville",
    name: "Libre Baskerville",
    category: "serif",
    cssFamily: '"Libre Baskerville Variable", serif',
    pdfFamily: "Invoice Libre Baskerville",
    previewClassName: "font-libre-baskerville",
    weights: STANDARD_WEIGHTS
  },
  {
    id: "geist-mono",
    name: "Geist Mono",
    category: "monospace",
    cssFamily: '"Geist Mono Variable", monospace',
    pdfFamily: "Invoice Geist Mono",
    previewClassName: "font-geist-mono",
    weights: STANDARD_WEIGHTS,
    letterSpacing: MONOSPACE_LETTER_SPACING
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    category: "monospace",
    cssFamily: '"JetBrains Mono Variable", monospace',
    pdfFamily: "Invoice JetBrains Mono",
    previewClassName: "font-jetbrains-mono",
    weights: STANDARD_WEIGHTS,
    letterSpacing: MONOSPACE_LETTER_SPACING
  },
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    category: "monospace",
    cssFamily: '"IBM Plex Mono", monospace',
    pdfFamily: "Invoice IBM Plex Mono",
    previewClassName: "font-ibm-plex-mono",
    weights: STANDARD_WEIGHTS,
    letterSpacing: MONOSPACE_LETTER_SPACING
  }
];

export function getInvoiceFontDefinition(
  fontId: InvoiceFont
): InvoiceFontDefinition {
  return INVOICE_FONTS.find(font => font.id === fontId) ?? INVOICE_FONTS[0];
}

export function getAvailableFontWeights(fontId: InvoiceFont): FontWeight[] {
  return getInvoiceFontDefinition(fontId).weights;
}
