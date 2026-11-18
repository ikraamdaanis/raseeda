import { StyleSheet, Text } from "@react-pdf/renderer";
import type { InvoiceTheme } from "~/types";
import { PDF_HEADING_PRESENCE_AHEAD, pdfRoleStyle } from "~/utils/pdf-styles";

const styles = StyleSheet.create({
  title: {
    marginTop: 20,
    marginBottom: 4,
    fontWeight: "medium",
    fontSize: 12
  },
  content: {
    fontSize: 10,
    color: "#6b7280"
  },
  untitledContent: {
    marginTop: 20
  }
});

// A labelled free-text block (notes, late-payment terms) for the PDF, mirroring
// the terms section. An empty block renders nothing. The heading and text sit
// straight on the page, not in a View: react-pdf only moves a heading to the
// next page for its text when something comes before it in its parent.
export function InvoicePdfTextSection({
  theme,
  label,
  content
}: {
  theme: InvoiceTheme;
  label: string;
  content: string;
}) {
  if (!content.trim()) {
    return null;
  }

  return (
    <>
      {label && (
        <Text
          minPresenceAhead={PDF_HEADING_PRESENCE_AHEAD}
          style={{ ...styles.title, ...pdfRoleStyle(theme, "sectionLabel") }}
        >
          {label}
        </Text>
      )}
      <Text
        style={{
          ...styles.content,
          ...(label ? {} : styles.untitledContent),
          ...pdfRoleStyle(theme, "termsContent")
        }}
      >
        {content}
      </Text>
    </>
  );
}
