import { Text } from "@react-pdf/renderer";
import type { InvoiceTheme } from "~/types";
import { getPageNumberLabel } from "~/utils/page-number";
import { PDF_PAGE_PADDING, pdfRoleStyle } from "~/utils/pdf-styles";

// Centred in the bottom margin of every page, once the PDF runs past one.
export function InvoicePdfPageNumber({ theme }: { theme: InvoiceTheme }) {
  return (
    <Text
      fixed
      style={pdfRoleStyle(theme, "termsContent", {
        position: "absolute",
        bottom: PDF_PAGE_PADDING / 2,
        left: PDF_PAGE_PADDING,
        right: PDF_PAGE_PADDING,
        textAlign: "center"
      })}
      render={getPageNumberLabel}
    />
  );
}
