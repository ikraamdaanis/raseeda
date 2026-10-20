import bricolage400 from "@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-400-normal.woff?url";
import bricolage500 from "@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-500-normal.woff?url";
import bricolage600 from "@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff?url";
import bricolage700 from "@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff?url";
import dmSans400 from "@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff?url";
import dmSans500 from "@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff?url";
import dmSans600 from "@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff?url";
import dmSans700 from "@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff?url";
import geistMono400 from "@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff?url";
import geistMono500 from "@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff?url";
import geistMono600 from "@fontsource/geist-mono/files/geist-mono-latin-600-normal.woff?url";
import geistMono700 from "@fontsource/geist-mono/files/geist-mono-latin-700-normal.woff?url";
import geist400 from "@fontsource/geist/files/geist-latin-400-normal.woff?url";
import geist500 from "@fontsource/geist/files/geist-latin-500-normal.woff?url";
import geist600 from "@fontsource/geist/files/geist-latin-600-normal.woff?url";
import geist700 from "@fontsource/geist/files/geist-latin-700-normal.woff?url";
import ibmPlexMono400 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff?url";
import ibmPlexMono500 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff?url";
import ibmPlexMono600 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff?url";
import ibmPlexMono700 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff?url";
import ibmPlexSans400 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff?url";
import ibmPlexSans500 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff?url";
import ibmPlexSans600 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff?url";
import ibmPlexSans700 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff?url";
import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff?url";
import inter500 from "@fontsource/inter/files/inter-latin-500-normal.woff?url";
import inter600 from "@fontsource/inter/files/inter-latin-600-normal.woff?url";
import inter700 from "@fontsource/inter/files/inter-latin-700-normal.woff?url";
import jetbrains400 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff?url";
import jetbrains500 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff?url";
import jetbrains600 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff?url";
import jetbrains700 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff?url";
import libreBaskerville400 from "@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff?url";
import libreBaskerville500 from "@fontsource/libre-baskerville/files/libre-baskerville-latin-500-normal.woff?url";
import libreBaskerville600 from "@fontsource/libre-baskerville/files/libre-baskerville-latin-600-normal.woff?url";
import libreBaskerville700 from "@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff?url";
import lora400 from "@fontsource/lora/files/lora-latin-400-normal.woff?url";
import lora500 from "@fontsource/lora/files/lora-latin-500-normal.woff?url";
import lora600 from "@fontsource/lora/files/lora-latin-600-normal.woff?url";
import lora700 from "@fontsource/lora/files/lora-latin-700-normal.woff?url";
import schibsted400 from "@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-400-normal.woff?url";
import schibsted500 from "@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-500-normal.woff?url";
import schibsted600 from "@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-600-normal.woff?url";
import schibsted700 from "@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff?url";
import { Font } from "@react-pdf/renderer";

interface PdfFontWeight {
  src: string;
  fontWeight: number;
}

interface PdfFontFamily {
  family: string;
  fonts: PdfFontWeight[];
}

function weights(
  family: string,
  sources: [string, string, string, string]
): PdfFontFamily {
  return {
    family,
    fonts: [
      { src: sources[0], fontWeight: 400 },
      { src: sources[1], fontWeight: 500 },
      { src: sources[2], fontWeight: 600 },
      { src: sources[3], fontWeight: 700 }
    ]
  };
}

export const PDF_FONT_FAMILIES: PdfFontFamily[] = [
  weights("Invoice Schibsted Grotesk", [
    schibsted400,
    schibsted500,
    schibsted600,
    schibsted700
  ]),
  weights("Invoice Geist", [geist400, geist500, geist600, geist700]),
  weights("Invoice Inter", [inter400, inter500, inter600, inter700]),
  weights("Invoice DM Sans", [dmSans400, dmSans500, dmSans600, dmSans700]),
  weights("Invoice IBM Plex Sans", [
    ibmPlexSans400,
    ibmPlexSans500,
    ibmPlexSans600,
    ibmPlexSans700
  ]),
  weights("Invoice Bricolage Grotesque", [
    bricolage400,
    bricolage500,
    bricolage600,
    bricolage700
  ]),
  weights("Invoice Lora", [lora400, lora500, lora600, lora700]),
  weights("Invoice Libre Baskerville", [
    libreBaskerville400,
    libreBaskerville500,
    libreBaskerville600,
    libreBaskerville700
  ]),
  weights("Invoice Geist Mono", [
    geistMono400,
    geistMono500,
    geistMono600,
    geistMono700
  ]),
  weights("Invoice JetBrains Mono", [
    jetbrains400,
    jetbrains500,
    jetbrains600,
    jetbrains700
  ]),
  weights("Invoice IBM Plex Mono", [
    ibmPlexMono400,
    ibmPlexMono500,
    ibmPlexMono600,
    ibmPlexMono700
  ])
];

let registered = false;

/** Register all invoice fonts for PDF export. Safe to call multiple times. */
export function registerInvoicePdfFonts() {
  if (typeof window === "undefined" || registered) {
    return;
  }

  for (const font of PDF_FONT_FAMILIES) {
    Font.register({
      family: font.family,
      fonts: font.fonts
    });
  }

  registered = true;
}
