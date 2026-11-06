import { Font } from "@react-pdf/renderer";
import bricolage400 from "~/styles/pdf-fonts/bricolage-grotesque-400.woff?url";
import bricolage500 from "~/styles/pdf-fonts/bricolage-grotesque-500.woff?url";
import bricolage600 from "~/styles/pdf-fonts/bricolage-grotesque-600.woff?url";
import bricolage700 from "~/styles/pdf-fonts/bricolage-grotesque-700.woff?url";
import dmSans400 from "~/styles/pdf-fonts/dm-sans-400.woff?url";
import dmSans500 from "~/styles/pdf-fonts/dm-sans-500.woff?url";
import dmSans600 from "~/styles/pdf-fonts/dm-sans-600.woff?url";
import dmSans700 from "~/styles/pdf-fonts/dm-sans-700.woff?url";
import geist400 from "~/styles/pdf-fonts/geist-400.woff?url";
import geist500 from "~/styles/pdf-fonts/geist-500.woff?url";
import geist600 from "~/styles/pdf-fonts/geist-600.woff?url";
import geist700 from "~/styles/pdf-fonts/geist-700.woff?url";
import geistMono400 from "~/styles/pdf-fonts/geist-mono-400.woff?url";
import geistMono500 from "~/styles/pdf-fonts/geist-mono-500.woff?url";
import geistMono600 from "~/styles/pdf-fonts/geist-mono-600.woff?url";
import geistMono700 from "~/styles/pdf-fonts/geist-mono-700.woff?url";
import ibmPlexMono400 from "~/styles/pdf-fonts/ibm-plex-mono-400.woff?url";
import ibmPlexMono500 from "~/styles/pdf-fonts/ibm-plex-mono-500.woff?url";
import ibmPlexMono600 from "~/styles/pdf-fonts/ibm-plex-mono-600.woff?url";
import ibmPlexMono700 from "~/styles/pdf-fonts/ibm-plex-mono-700.woff?url";
import ibmPlexSans400 from "~/styles/pdf-fonts/ibm-plex-sans-400.woff?url";
import ibmPlexSans500 from "~/styles/pdf-fonts/ibm-plex-sans-500.woff?url";
import ibmPlexSans600 from "~/styles/pdf-fonts/ibm-plex-sans-600.woff?url";
import ibmPlexSans700 from "~/styles/pdf-fonts/ibm-plex-sans-700.woff?url";
import inter400 from "~/styles/pdf-fonts/inter-400.woff?url";
import inter500 from "~/styles/pdf-fonts/inter-500.woff?url";
import inter600 from "~/styles/pdf-fonts/inter-600.woff?url";
import inter700 from "~/styles/pdf-fonts/inter-700.woff?url";
import jetbrains400 from "~/styles/pdf-fonts/jetbrains-mono-400.woff?url";
import jetbrains500 from "~/styles/pdf-fonts/jetbrains-mono-500.woff?url";
import jetbrains600 from "~/styles/pdf-fonts/jetbrains-mono-600.woff?url";
import jetbrains700 from "~/styles/pdf-fonts/jetbrains-mono-700.woff?url";
import libreBaskerville400 from "~/styles/pdf-fonts/libre-baskerville-400.woff?url";
import libreBaskerville500 from "~/styles/pdf-fonts/libre-baskerville-500.woff?url";
import libreBaskerville600 from "~/styles/pdf-fonts/libre-baskerville-600.woff?url";
import libreBaskerville700 from "~/styles/pdf-fonts/libre-baskerville-700.woff?url";
import lora400 from "~/styles/pdf-fonts/lora-400.woff?url";
import lora500 from "~/styles/pdf-fonts/lora-500.woff?url";
import lora600 from "~/styles/pdf-fonts/lora-600.woff?url";
import lora700 from "~/styles/pdf-fonts/lora-700.woff?url";
import schibsted400 from "~/styles/pdf-fonts/schibsted-grotesk-400.woff?url";
import schibsted500 from "~/styles/pdf-fonts/schibsted-grotesk-500.woff?url";
import schibsted600 from "~/styles/pdf-fonts/schibsted-grotesk-600.woff?url";
import schibsted700 from "~/styles/pdf-fonts/schibsted-grotesk-700.woff?url";

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
