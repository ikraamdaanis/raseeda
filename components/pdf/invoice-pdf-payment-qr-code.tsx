import { Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import {
  PAYMENT_QR_CODE_QUIET_ZONE,
  PAYMENT_QR_CODE_SIZE_MM
} from "~/consts/payment-qr-code";
import { POINTS_PER_MM } from "~/consts/signature";
import type { InvoiceTheme } from "~/types";
import { pdfRoleStyle } from "~/utils/pdf-styles";
import { getQrCodePath } from "~/utils/qr-code";

const styles = StyleSheet.create({
  block: {
    flexShrink: 0,
    alignItems: "center"
  },
  caption: {
    marginTop: 2,
    textAlign: "center"
  }
});

// A payment QR code, drawn on the device, with "Scan to pay" under it. The
// code is 2.5cm across, its quiet zone white around it, and it never splits
// across pages.
export function InvoicePdfPaymentQrCode({
  theme,
  payload
}: {
  theme: InvoiceTheme;
  payload: string;
}) {
  const { size, path } = getQrCodePath(payload);
  const quietZone = PAYMENT_QR_CODE_QUIET_ZONE;
  const fullSize = size + quietZone * 2;
  const width = ((PAYMENT_QR_CODE_SIZE_MM * POINTS_PER_MM) / size) * fullSize;

  return (
    <View style={styles.block} wrap={false}>
      <Svg
        width={width}
        height={width}
        viewBox={`${-quietZone} ${-quietZone} ${fullSize} ${fullSize}`}
      >
        <Rect
          x={-quietZone}
          y={-quietZone}
          width={fullSize}
          height={fullSize}
          fill="#ffffff"
        />
        <Path d={path} fill="#000000" />
      </Svg>
      <Text style={pdfRoleStyle(theme, "termsContent", styles.caption)}>
        Scan to pay
      </Text>
    </View>
  );
}
