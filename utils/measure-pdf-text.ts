import { Font } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { getInvoiceFontDefinition } from "~/consts/invoice-fonts";
import { FALLBACK_EM_PER_CHARACTER } from "~/consts/text-measurement";
import type { InvoiceTheme } from "~/types";

const PDF_FONT_WEIGHTS = [400, 500, 600, 700];

// react-pdf loads a font as it lays the page out, which is too late to size a
// column by its text. Loading the invoice's font first lets measurePdfText use
// its real metrics.
export async function loadInvoicePdfFonts(theme: InvoiceTheme) {
  const fontFamily = getInvoiceFontDefinition(theme.font).pdfFamily;

  await Promise.all(
    PDF_FONT_WEIGHTS.map(fontWeight => Font.load({ fontFamily, fontWeight }))
  );
}

// How wide a line of text sets in points, in a style from pdfRoleStyle.
export function measurePdfText(text: string, style: Style) {
  const fontSize = Number(style.fontSize ?? 12);
  const characters = Array.from(text).length;
  const letterSpacing = Number(style.letterSpacing ?? 0) * characters;
  const font =
    typeof style.fontFamily === "string" &&
    Font.getRegisteredFontFamilies().includes(style.fontFamily)
      ? Font.getFont({
          fontFamily: style.fontFamily,
          fontWeight: Number(style.fontWeight ?? 400)
        }).data
      : null;

  const fallback =
    characters * FALLBACK_EM_PER_CHARACTER * fontSize + letterSpacing;

  if (!font) return fallback;

  // A font fontkit can't read lays out with the guess rather than failing the
  // PDF.
  try {
    return (
      (font.layout(text).advanceWidth / font.unitsPerEm) * fontSize +
      letterSpacing
    );
  } catch {
    return fallback;
  }
}
