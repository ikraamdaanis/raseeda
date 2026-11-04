import type { Style } from "@react-pdf/types";
import type { InvoiceTheme, TextRole, TextSettings } from "~/types";
import { getFontWeight } from "~/utils/get-font-weight";
import { getRoleSettings } from "~/utils/get-role-settings";
import { scaleFontSize } from "~/utils/scale-font-size";

// The page: A4, in points, and the margin round it.
export const PDF_PAGE_WIDTH = 595.28;
export const PDF_PAGE_PADDING = 40;

// Line height shared by section labels, address lines and detail rows, the
// PDF twin of the editor's leading-paper-row, so the details column lands on
// the same lines as the address beside it.
export const PDF_ROW_LINE_HEIGHT = 1.5;

/**
 * Convert TextSettings to a PDF-compatible style object.
 * Handles font size scaling and weight mapping internally.
 */
export function pdfStyle(
  settings: Partial<TextSettings>,
  overrides?: Style
): Style {
  const fontSize = scaleFontSize(settings.size ?? 0);
  const base: Style = {
    textAlign: settings.align,
    fontSize,
    fontWeight: getFontWeight(settings.weight ?? "Normal"),
    color: settings.color,
    fontFamily: settings.pdfFontFamily ?? settings.fontFamily,
    letterSpacing: settings.letterSpacing?.endsWith("em")
      ? parseFloat(settings.letterSpacing) * fontSize
      : settings.letterSpacing
  };

  return overrides ? { ...base, ...overrides } : base;
}

/**
 * Resolve a text role to a PDF style, applying the theme-derived settings.
 * Mirrors getRoleSettings + getTextStyles on the canvas side.
 */
export function pdfRoleStyle(
  theme: InvoiceTheme,
  role: TextRole,
  overrides?: Style
): Style {
  return pdfStyle(getRoleSettings(theme, role), overrides);
}
