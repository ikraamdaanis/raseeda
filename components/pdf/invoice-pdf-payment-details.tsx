import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Invoice } from "~/types";
import { getPaymentRows } from "~/utils/payment-details";
import { pdfRoleStyle } from "~/utils/pdf-styles";

const styles = StyleSheet.create({
  section: {
    marginTop: 20
  },
  fields: {
    marginTop: 6,
    flexDirection: "column",
    gap: 3
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  fieldLabel: {
    width: 96,
    flexShrink: 0
  },
  fieldValue: {
    flex: 1
  },
  terms: {
    marginTop: 6
  }
});

export function InvoicePdfPaymentDetails({ invoice }: { invoice: Invoice }) {
  const { theme, paymentDetails } = invoice;
  const rows = getPaymentRows(paymentDetails);

  if (rows.length === 0 && !paymentDetails.terms.trim()) {
    return null;
  }

  // Labels and values share the body text style, so they read as one block.
  const labelStyle = pdfRoleStyle(theme, "termsContent", styles.fieldLabel);
  const valueStyle = pdfRoleStyle(theme, "termsContent", styles.fieldValue);

  return (
    <View style={styles.section}>
      {paymentDetails.label && (
        <Text style={pdfRoleStyle(theme, "sectionLabel")}>
          {paymentDetails.label}
        </Text>
      )}
      {rows.length > 0 && (
        <View style={styles.fields}>
          {rows.map(row => (
            <View key={row.id} style={styles.field}>
              <Text style={labelStyle}>{row.label}</Text>
              <Text style={valueStyle}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
      {paymentDetails.terms.trim() !== "" && (
        <Text style={pdfRoleStyle(theme, "termsContent", styles.terms)}>
          {paymentDetails.terms}
        </Text>
      )}
    </View>
  );
}
