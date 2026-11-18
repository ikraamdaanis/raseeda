import { Link, StyleSheet, Text, View } from "@react-pdf/renderer";
import { InvoicePdfPaymentQrCode } from "~/components/pdf/invoice-pdf-payment-qr-code";
import type { Invoice } from "~/types";
import { getPrintedLanguage, getPrintedWord } from "~/utils/label-preset";
import { getPaymentRows } from "~/utils/payment-details";
import { getPaymentQrCode } from "~/utils/payment-qr-code";
import { PDF_HEADING_PRESENCE_AHEAD, pdfRoleStyle } from "~/utils/pdf-styles";
import { getPrintedSections } from "~/utils/section-visibility";

const styles = StyleSheet.create({
  // The gap above the section, under its heading's top or the rows' when
  // there's no heading.
  sectionStart: {
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
    <>
      {paymentDetails.label && (
        <Text
          minPresenceAhead={PDF_HEADING_PRESENCE_AHEAD}
          style={pdfRoleStyle(theme, "sectionLabel", styles.sectionStart)}
        >
          {paymentDetails.label}
        </Text>
      )}
      <View style={paymentDetails.label ? undefined : styles.sectionStart}>
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
              <InvoicePdfPaymentQrCode
                theme={theme}
                payload={qrPayload}
                caption={getPrintedWord(
                  "scanToPay",
                  getPrintedLanguage(invoice)
                )}
              />
            )}
          </View>
        )}
        {paymentDetails.terms.trim() !== "" && (
          <Text style={pdfRoleStyle(theme, "termsContent", styles.terms)}>
            {paymentDetails.terms}
          </Text>
        )}
      </View>
    </>
  );
}
