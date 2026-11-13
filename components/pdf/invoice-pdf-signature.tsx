import { Image as PDFImage, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  POINTS_PER_MM,
  SIGNATURE_HEIGHT_MM,
  SIGNATURE_WIDTH_MM
} from "~/consts/signature";
import type { InvoiceTheme } from "~/types";
import { pdfRoleStyle } from "~/utils/pdf-styles";

const SIGNATURE_WIDTH = SIGNATURE_WIDTH_MM * POINTS_PER_MM;

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    alignItems: "flex-end"
  },
  block: {
    width: SIGNATURE_WIDTH,
    alignItems: "center"
  },
  image: {
    width: SIGNATURE_WIDTH,
    height: SIGNATURE_HEIGHT_MM * POINTS_PER_MM,
    objectFit: "contain"
  },
  caption: {
    marginTop: 4,
    width: SIGNATURE_WIDTH
  }
});

// The signature, last on the page against the right margin, with its name or
// caption under it. It follows the content and never splits across pages.
export function InvoicePdfSignature({
  theme,
  imageUrl,
  caption
}: {
  theme: InvoiceTheme;
  imageUrl: string;
  caption: string;
}) {
  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.block}>
        <PDFImage src={imageUrl} style={styles.image} />
        {caption.trim() && (
          <Text
            style={{
              ...styles.caption,
              ...pdfRoleStyle(theme, "termsContent", { textAlign: "center" })
            }}
          >
            {caption}
          </Text>
        )}
      </View>
    </View>
  );
}
