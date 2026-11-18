import { StyleSheet, Text } from "@react-pdf/renderer";
import type { Invoice } from "~/types";
import { PDF_HEADING_PRESENCE_AHEAD, pdfRoleStyle } from "~/utils/pdf-styles";

const styles = StyleSheet.create({
  termsTitle: {
    marginTop: 20,
    marginBottom: 4,
    fontWeight: "medium",
    fontSize: 12
  },
  termsContent: {
    fontSize: 10,
    color: "#6b7280"
  },
  untitledContent: {
    marginTop: 20
  }
});

// Straight on the page, like InvoicePdfTextSection, so the heading keeps to
// its text across a page break.

export function InvoicePdfTerms({ invoice }: { invoice: Invoice }) {
  const theme = invoice.theme;

  if (!invoice.terms.content.trim()) {
    return null;
  }

  return (
    <>
      {invoice.terms.label && (
        <Text
          minPresenceAhead={PDF_HEADING_PRESENCE_AHEAD}
          style={{
            ...styles.termsTitle,
            ...pdfRoleStyle(theme, "sectionLabel")
          }}
        >
          {invoice.terms.label}
        </Text>
      )}
      <Text
        style={{
          ...styles.termsContent,
          ...(invoice.terms.label ? {} : styles.untitledContent),
          ...pdfRoleStyle(theme, "termsContent")
        }}
      >
        {invoice.terms.content}
      </Text>
    </>
  );
}
