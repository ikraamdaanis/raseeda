import { Font, renderToFile } from "@react-pdf/renderer";
import { spawn } from "bun";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  HERO_INVOICE_NUMBER,
  PDF_RENDER_SCALE,
  PDF_RENDERS,
  renderSrc
} from "~/components/home/pdf-renders";
import { InvoicePDF } from "~/components/pdf/invoice-generator";
import { invoiceDefault } from "~/stores/invoice-store";
import type { Invoice, InvoiceItem } from "~/types";
import { PDF_FONT_FAMILIES } from "~/utils/register-invoice-pdf-fonts";

// Renders the homepage's invoice picture with the app's own PDF component, so
// it is a real PDF rather than a drawing of one. Run `bun run render:home`
// after changing the PDF layout or the sample; it needs poppler (pdftoppm)
// and cwebp on the PATH.

const OUTPUT_DIR = join(import.meta.dir, "..", "public");

// The sample business's logo, a 384px PNG master; the company is fictional.
// Marlow Studio's is a wordmark set in Bricolage Grotesque.
const LOGO_DIR = join(import.meta.dir, "assets", "logos");

// The page in CSS pixels; pdftoppm renders 72pt to 96px at 96 DPI.
const RENDER_DPI = 96 * PDF_RENDER_SCALE;

for (const font of PDF_FONT_FAMILIES) {
  Font.register({ family: font.family, fonts: font.fonts });
}

function items(rows: [string, number, string, number][]): InvoiceItem[] {
  return rows.map(([description, quantity, unit, unitPrice], index) => ({
    id: String(index),
    description,
    quantity,
    unit,
    unitPrice
  }));
}

function sampleInvoice(
  overrides: Partial<Invoice> & Pick<Invoice, "seller" | "client" | "items">
): Invoice {
  const invoice: Invoice = {
    ...structuredClone(invoiceDefault),
    ...overrides,
    seller: { ...invoiceDefault.seller, ...overrides.seller },
    client: { ...invoiceDefault.client, ...overrides.client },
    labels: { ...invoiceDefault.labels, ...overrides.labels },
    paymentDetails: {
      ...invoiceDefault.paymentDetails,
      ...overrides.paymentDetails
    }
  };

  // The optional text sections start switched off on a new invoice; a sample
  // that fills one in has it switched on, as the editor would.
  return {
    ...invoice,
    sections: {
      ...invoice.sections,
      shipping: invoice.shipping.content.trim() !== "",
      notes: invoice.notes.content.trim() !== "",
      terms: invoice.terms.content.trim() !== "",
      latePayment: invoice.latePayment.content.trim() !== ""
    }
  };
}

// A Brooklyn illustration studio's commission for a Portland publisher, with
// a returning-client discount. The hero shows it inside the editor's window.
const HERO_INVOICE = sampleInvoice({
  number: HERO_INVOICE_NUMBER,
  invoiceDate: "2026-10-05",
  dueDate: "2026-11-04",
  seller: {
    label: "From",
    content: "Marlow Studio LLC\n68 Jay Street, Suite 902\nBrooklyn, NY 11201",
    placeholder: ""
  },
  client: {
    label: "Bill to",
    content:
      "Fernhill Press\n1306 NW Hoyt Street, Suite 210\nPortland, OR 97209",
    placeholder: ""
  },
  items: items([
    ["Editorial illustrations", 3, "pcs", 600],
    ["Cover artwork", 1, "pcs", 950],
    ["Spot illustrations", 6, "pcs", 175],
    ["Print and web license", 1, "ea", 400]
  ]),
  discounts: 10,
  discountType: "percentage",
  paymentDetails: {
    label: "Payment details",
    bankName: "JPMorgan Chase Bank, N.A.",
    accountNumber: "483920175",
    routingNumber: "021000021",
    iban: "",
    bic: "CHASUS33",
    sortCode: "",
    terms: "Payment due within 30 days."
  }
});

async function run(command: string[]) {
  const child = spawn(command, { stderr: "pipe" });
  const exitCode = await child.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(child.stderr).text();

    throw new Error(`${command[0]} failed: ${stderr}`);
  }
}

// Renders the invoice's first page to a PNG at the homepage's render scale.
async function renderPage(directory: string, name: string, invoice: Invoice) {
  const pdfPath = join(directory, `${name}.pdf`);
  const pngPath = join(directory, name);

  await renderToFile(<InvoicePDF invoice={invoice} />, pdfPath);
  await run([
    "pdftoppm",
    "-r",
    String(RENDER_DPI),
    "-png",
    "-singlefile",
    "-f",
    "1",
    "-l",
    "1",
    pdfPath,
    pngPath
  ]);

  return `${pngPath}.png`;
}

async function writeWebp({
  pngPath,
  src,
  crop,
  width
}: {
  pngPath: string;
  src: string;
  crop?: { x: number; y: number; width: number; height: number };
  width?: number;
}) {
  const cropArgs = crop
    ? [crop.x, crop.y, crop.width, crop.height].map(value =>
        String(Math.round(value * PDF_RENDER_SCALE))
      )
    : [];

  await run([
    "cwebp",
    "-quiet",
    "-q",
    "88",
    "-m",
    "6",
    ...(crop ? ["-crop", ...cropArgs] : []),
    ...(width ? ["-resize", String(width), "0"] : []),
    pngPath,
    "-o",
    join(OUTPUT_DIR, src)
  ]);
}

const directory = await mkdtemp(join(tmpdir(), "homepage-renders-"));

try {
  await mkdir(join(OUTPUT_DIR, "home"), { recursive: true });

  const heroPngPath = await renderPage(directory, "hero", {
    ...HERO_INVOICE,
    image: join(LOGO_DIR, "marlow.png")
  });

  for (const width of PDF_RENDERS.hero.widths) {
    await writeWebp({
      pngPath: heroPngPath,
      src: renderSrc(PDF_RENDERS.hero, width),
      crop: PDF_RENDERS.hero.crop,
      width
    });
  }

  process.stdout.write(
    `Wrote the invoice renders to ${join(OUTPUT_DIR, "home")}\n`
  );
} finally {
  if (process.argv.includes("--keep")) {
    process.stdout.write(`Kept the page renders in ${directory}\n`);
  } else {
    await rm(directory, { recursive: true, force: true });
  }
}
