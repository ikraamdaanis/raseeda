import { Link, StyleSheet, Text, View } from "@react-pdf/renderer";
import { InvoicePdfPaymentQrCode } from "~/components/pdf/invoice-pdf-payment-qr-code";
import type { Invoice } from "~/types";
import { getPaymentRows } from "~/utils/payment-details";
import { getPaymentQrCode } from "~/utils/payment-qr-code";
import { pdfRoleStyle } from "~/utils/pdf-styles";
import { getPrintedSections } from "~/utils/section-visibility";

const styles = StyleSheet.create({
  section: {
    marginTop: 20
  },
  body: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  fields: {
    flex: 1,
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
  link: {
    textDecoration: "underline"
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

  const qrCode = getPaymentQrCode(invoice);
  const qrPayload =
    getPrintedSections(invoice).paymentQrCode && "payload" in qrCode
      ? qrCode.payload
      : "";
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
        <View style={styles.body}>
          <View style={styles.fields}>
            {rows.map(row => (
              <View key={row.id} style={styles.field}>
                <Text style={labelStyle}>{row.label}</Text>
                {row.href ? (
                  <Link src={row.href} style={[valueStyle, styles.link]}>
                    {row.value}
                  </Link>
                ) : (
                  <Text style={valueStyle}>{row.value}</Text>
                )}
              </View>
            ))}
          </View>
          {qrPayload !== "" && (
            <InvoicePdfPaymentQrCode theme={theme} payload={qrPayload} />
          )}
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
