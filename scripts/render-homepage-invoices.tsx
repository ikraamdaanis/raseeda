import { Font, renderToFile } from "@react-pdf/renderer";
import { spawn } from "bun";
import { Buffer } from "node:buffer";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  HERO_INVOICE_NUMBER,
  PDF_RENDER_SCALE,
  PDF_RENDERS,
  renderSrc
} from "~/components/home/pdf-renders";
import { InvoicePDF } from "~/components/pdf/invoice-generator";
import {
  INVOICE_TEMPLATES,
  TEMPLATE_RENDER_WIDTHS,
  templateSrc
} from "~/components/templates/invoice-templates";
import { SITE_TEMPLATES } from "~/consts/site-templates";
import { invoiceDefault } from "~/stores/invoice-store";
import type { Invoice, InvoiceItem, SiteTemplateId } from "~/types";
import { applyDocumentType } from "~/utils/document-type";
import { loadInvoicePdfFonts } from "~/utils/measure-pdf-text";
import { PDF_FONT_FAMILIES } from "~/utils/register-invoice-pdf-fonts";
import { PAGE_META } from "~/utils/site-meta";

// Renders the homepage's invoice picture and the template gallery's, with
// its share card, using the app's own PDF component, so each is a real PDF
// rather than a drawing of one. Run `bun run render:home`
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
  overrides: Omit<Partial<Invoice>, "paymentDetails"> &
    Pick<Invoice, "seller" | "client" | "items"> & {
      paymentDetails?: Partial<Invoice["paymentDetails"]>;
    }
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
    accountName: "",
    accountNumber: "483920175",
    routingNumber: "021000021",
    iban: "",
    bic: "CHASUS33",
    sortCode: "",
    terms: "Payment due within 30 days."
  }
});

// The template gallery's invoices (components/templates/invoice-templates.ts),
// one per line of work, each in its template's font.
const TEMPLATE_INVOICES: Record<
  (typeof INVOICE_TEMPLATES)[number]["id"],
  Invoice
> = {
  // A Chicago brand designer's project for a health startup, partly hourly.
  freelance: sampleInvoice({
    number: "MO-0118",
    invoiceDate: "2026-10-09",
    dueDate: "2026-10-23",
    seller: {
      label: "From",
      content:
        "Maya Okafor Design\n1847 W Division Street, Unit 3\nChicago, IL 60622\nmaya@okafor.design",
      placeholder: ""
    },
    client: {
      label: "Bill to",
      content:
        "Brightloop Health, Inc.\n333 N Green Street, Suite 1100\nChicago, IL 60607",
      placeholder: ""
    },
    items: items([
      ["Brand identity design", 1, "ea", 3200],
      ["Logo files and usage guide", 1, "ea", 450],
      ["Landing page design", 18, "hrs", 95],
      ["Revisions", 4, "hrs", 95]
    ]),
    paymentDetails: {
      label: "Payment details",
      bankName: "BMO Bank N.A.",
      accountName: "",
      accountNumber: "4417 2093 8851",
      routingNumber: "071000288",
      iban: "",
      bic: "HATRUS44",
      sortCode: "",
      terms: "Payment due within 14 days."
    },
    notes: {
      label: "Notes",
      content: "Thanks, Priya! The final files are in the shared folder."
    }
  }),
  // A Boston strategy firm's monthly retainer for a biotech, against a PO.
  consulting: sampleInvoice({
    number: "WAG-2026-031",
    poNumber: "PO-58213",
    invoiceDate: "2026-10-31",
    dueDate: "2026-11-30",
    servicePeriod: "Oct 1–31, 2026",
    dateFormat: "MMMM d, yyyy",
    seller: {
      label: "From",
      content:
        "Whitcombe Advisory Group LLC\n100 Federal Street, 22nd Floor\nBoston, MA 02110\n(617) 555-0172",
      placeholder: ""
    },
    client: {
      label: "Bill to",
      content:
        "Kestrel Biologics, Inc.\nAttn: Finance Department\n35 Cambridgepark Drive\nCambridge, MA 02140",
      placeholder: ""
    },
    items: items([
      ["Strategy retainer, October", 1, "mo", 12000],
      ["Leadership workshops", 2, "days", 3500],
      ["Market sizing analysis", 24, "hrs", 275]
    ]),
    paymentDetails: {
      label: "Payment details",
      bankName: "Citizens Bank, N.A.",
      accountName: "",
      accountNumber: "1308 4472 9915",
      routingNumber: "211070175",
      iban: "",
      bic: "CTZIUS33",
      sortCode: "",
      terms: "Net 30."
    },
    latePayment: {
      label: "Late payment",
      content: "Balances unpaid after 30 days accrue interest at 1% a month."
    }
  }),
  // An Austin bakery's catering order for an office, with Texas sales tax.
  "small-business": sampleInvoice({
    number: "SB-1593",
    invoiceDate: "2026-10-14",
    dueDate: "2026-10-28",
    seller: {
      label: "From",
      content:
        "Sunflour Bakery & Café\n1515 S Congress Avenue\nAustin, TX 78704\n(512) 555-0136",
      placeholder: ""
    },
    client: {
      label: "Bill to",
      content:
        "Lonestar Robotics\n500 W 5th Street, Suite 800\nAustin, TX 78701",
      placeholder: ""
    },
    items: items([
      ["Breakfast catering, 40 guests", 1, "ea", 680],
      ["Assorted pastry boxes", 12, "pcs", 38],
      ["Custom celebration cake", 1, "ea", 145],
      ["Coffee service", 3, "gal", 42]
    ]),
    tax: { percentage: 8.25, exempt: false, note: "", perLine: false },
    fees: 35,
    labels: { ...invoiceDefault.labels, fees: "Delivery" },
    paymentDetails: {
      label: "Payment details",
      bankName: "Frost Bank",
      accountName: "",
      accountNumber: "6620 3817 4459",
      routingNumber: "114000093",
      iban: "",
      bic: "FRSTUS44",
      sortCode: "",
      terms: "Due within 14 days."
    },
    notes: {
      label: "Notes",
      content: "Thank you for ordering with us!"
    }
  }),
  // A Denver remodeler's kitchen job for homeowners, less the deposit.
  contractor: sampleInvoice({
    number: "SRB-0742",
    invoiceDate: "2026-10-20",
    dueDate: "2026-11-03",
    dateFormat: "MM/dd/yyyy",
    seller: {
      label: "From",
      content:
        "Summit Ridge Builders LLC\n4280 Tennyson Street\nDenver, CO 80212\n(303) 555-0187",
      placeholder: ""
    },
    client: {
      label: "Bill to",
      content:
        "Daniel and Rachel Moreno\n2731 S Josephine Street\nDenver, CO 80210",
      placeholder: ""
    },
    shipping: {
      label: "Job site",
      content: "Kitchen remodel\n2731 S Josephine Street\nDenver, CO 80210",
      placeholder: ""
    },
    items: items([
      ["Demolition and haul-away", 1, "ea", 1850],
      ["Framing and drywall labor", 42, "hrs", 68],
      ["Electrical rough-in", 1, "ea", 2400],
      ["Cabinets and hardware", 1, "ea", 6240],
      ["Tile and setting materials", 120, "sq ft", 14.5]
    ]),
    amountPaid: 6000,
    labels: { ...invoiceDefault.labels, amountPaid: "Deposit paid" },
    paymentDetails: {
      label: "Payment details",
      bankName: "Wells Fargo Bank, N.A.",
      accountName: "",
      accountNumber: "8104 6629 3375",
      routingNumber: "102000076",
      iban: "",
      bic: "WFBIUS6S",
      sortCode: "",
      terms: "Balance due within 14 days of completion."
    }
  }),
  // A Charleston wedding photographer's package, less the retainer.
  photography: sampleInvoice({
    number: "ARP-2611",
    invoiceDate: "2026-10-06",
    dueDate: "2026-10-31",
    dateFormat: "MMMM d, yyyy",
    seller: {
      label: "From",
      content:
        "Ashley Rivers Photography\n89 Rutledge Avenue\nCharleston, SC 29401\nhello@ashleyrivers.photo",
      placeholder: ""
    },
    client: {
      label: "Bill to",
      content:
        "Olivia Bennett and James Carter\n412 Coleman Boulevard\nMount Pleasant, SC 29464",
      placeholder: ""
    },
    items: items([
      ["Wedding day coverage", 8, "hrs", 475],
      ["Second shooter", 8, "hrs", 75],
      ["Engagement session", 1, "ea", 450],
      ["Fine art album, 10 × 10", 1, "ea", 650]
    ]),
    amountPaid: 1000,
    labels: { ...invoiceDefault.labels, amountPaid: "Retainer paid" },
    paymentDetails: {
      label: "Payment details",
      bankName: "Truist Bank",
      accountName: "",
      accountNumber: "1150 7738 2046",
      routingNumber: "053201607",
      iban: "",
      bic: "BRBTUS33",
      sortCode: "",
      terms: "Balance due two weeks before the wedding."
    },
    notes: {
      label: "Notes",
      content: "Thank you for trusting me with your day. I can’t wait!"
    }
  }),
  // A Raleigh studio's month of work on a patient portal, plus hosting.
  "web-development": sampleInvoice({
    number: "PC-0256",
    invoiceDate: "2026-11-01",
    dueDate: "2026-12-01",
    servicePeriod: "Oct 1–31, 2026",
    seller: {
      label: "From",
      content:
        "Pinecrest Code LLC\n412 Fayetteville Street, Suite 1100\nRaleigh, NC 27601\nbilling@pinecrestcode.com",
      placeholder: ""
    },
    client: {
      label: "Bill to",
      content:
        "Triangle Home Health Partners\n8601 Six Forks Road, Suite 400\nRaleigh, NC 27615",
      placeholder: ""
    },
    items: items([
      ["Patient portal development", 56, "hrs", 135],
      ["Accessibility fixes", 12, "hrs", 135],
      ["Hosting, October", 1, "mo", 180],
      ["Domain renewal", 1, "yr", 24]
    ]),
    paymentDetails: {
      label: "Payment details",
      bankName: "PNC Bank, N.A.",
      accountName: "",
      accountNumber: "5302 1186 7740",
      routingNumber: "043000096",
      iban: "",
      bic: "PNCCUS33",
      sortCode: "",
      terms: "Net 30."
    }
  })
};

async function run(command: string[]) {
  const child = spawn(command, { stderr: "pipe" });
  const exitCode = await child.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(child.stderr).text();

    throw new Error(`${command[0]} failed: ${stderr}`);
  }
}

// The site template pages' finished examples (consts/site-templates.ts): each
// shows its template in use, so a page's picture matches what it opens.
function party(label: string, content: string) {
  return { label, content, placeholder: "" };
}

const POUNDS = { currency: "\u00a3", currencyCode: "GBP" };

const NET_30 = { terms: "Payment due within 30 days." };

const SITE_TEMPLATE_INVOICES: Record<SiteTemplateId, Invoice> = {
  // A Bristol landscaper's price for a block of flats' courtyard.
  quote: applyDocumentType(
    sampleInvoice({
      ...POUNDS,
      number: "QUO-0312",
      invoiceDate: "2026-10-12",
      dueDate: "2026-11-11",
      seller: party(
        "From",
        "Fernway Landscapes Ltd\n18 Mina Road\nBristol BS2 9XJ"
      ),
      client: party(
        "Quote for",
        "Harbour Row Apartments\n2 Canons Way\nBristol BS1 5LF"
      ),
      items: items([
        ["Courtyard design and planting plan", 1, "ea", 850],
        ["Paving, supplied and laid", 64, "sq m", 92],
        ["Raised beds and planting", 6, "ea", 340]
      ]),
      tax: { percentage: 20, exempt: false, note: "", perLine: false },
      notes: {
        label: "Notes",
        content: "Price includes removal of the existing paving."
      }
    }),
    "quote"
  ),
  // A Lisbon tile maker's order for a Danish interiors firm, paid up front.
  "proforma-invoice": applyDocumentType(
    sampleInvoice({
      currency: "\u20ac",
      currencyCode: "EUR",
      number: "PRO-0088",
      sections: { ...invoiceDefault.sections, tax: false },
      invoiceDate: "2026-10-05",
      dueDate: "2026-10-19",
      seller: party(
        "From",
        "Tessera Ceramics Lda\nRua da Boavista 84\n1200-066 Lisbon, Portugal"
      ),
      client: party(
        "To",
        "Nordhavn Interiors ApS\nSundkrogsgade 21\n2100 Copenhagen, Denmark"
      ),
      items: items([
        ["Hand-glazed wall tiles, sage", 48, "sq m", 74],
        ["Hand-glazed floor tiles, slate", 30, "sq m", 88],
        ["Crating and freight to Copenhagen", 1, "ea", 620]
      ]),
      paymentDetails: {
        label: "Payment details",
        bankName: "Millennium BCP",
        accountName: "Tessera Ceramics Lda",
        iban: "PT50 0033 0000 4553 8901 2345 6",
        bic: "BCOMPTPL",
        terms: "Payment up front releases the order for firing."
      }
    }),
    "proforma-invoice"
  ),
  // A Toronto studio's class pass, paid at the desk.
  receipt: applyDocumentType(
    sampleInvoice({
      currency: "$",
      currencyCode: "CAD",
      number: "REC-2207",
      invoiceDate: "2026-10-17",
      dueDate: "2026-10-17",
      paidBy: "Visa ending 4417",
      seller: party(
        "From",
        "Copperleaf Yoga\n912 Queen Street West\nToronto, ON M6J 1G6"
      ),
      client: party("Received from", "Priya Nair"),
      items: items([
        ["Ten-class pass", 1, "ea", 180],
        ["Yoga mat", 1, "ea", 62]
      ]),
      tax: { percentage: 13, exempt: false, note: "", perLine: false }
    }),
    "receipt"
  ),
  // A Leeds office supplier's credit for two chairs sent back.
  "credit-note": applyDocumentType(
    sampleInvoice({
      ...POUNDS,
      number: "CN-0041",
      invoiceDate: "2026-10-21",
      dueDate: "2026-10-21",
      refersTo: "INV-1187, 2 Oct 2026",
      seller: party(
        "From",
        "Oakline Office Supply Ltd\n7 Kirkstall Road\nLeeds LS3 1LH"
      ),
      client: party(
        "Credit to",
        "Brightwater Dental\n40 Park Row\nLeeds LS1 5JL"
      ),
      items: items([
        ["Task chair, returned undamaged", 2, "ea", 189],
        ["Return delivery charge refunded", 1, "ea", 18]
      ]),
      tax: { percentage: 20, exempt: false, note: "", perLine: false },
      notes: { label: "Notes", content: "Returned goods received 19 Oct 2026." }
    }),
    "credit-note"
  ),
  // A Manchester developer's month of hours for a studio.
  freelance: sampleInvoice({
    ...POUNDS,
    number: "TA-0064",
    theme: { ...invoiceDefault.theme, font: "dm-sans" },
    sections: { ...invoiceDefault.sections, tax: false },
    invoiceDate: "2026-10-31",
    dueDate: "2026-11-30",
    servicePeriod: "1 to 31 Oct 2026",
    tableSettings: {
      ...invoiceDefault.tableSettings,
      columnLabels: {
        ...invoiceDefault.tableSettings.columnLabels,
        quantity: "Hours",
        unitPrice: "Rate"
      }
    },
    seller: party("From", "Tom Adeyemi\n31 Hilton Street\nManchester M1 2EH"),
    client: party("To", "Lark Studio\n5 Jordan Street\nManchester M15 4PY"),
    items: items([
      ["Checkout rebuild", 46, "hrs", 65],
      ["Planning meetings and calls", 5, "hrs", 65],
      ["Revisions after review", 9, "hrs", 65]
    ]),
    paymentDetails: {
      label: "Payment details",
      bankName: "Monzo Bank",
      accountNumber: "20418863",
      sortCode: "04-00-04",
      ...NET_30
    }
  }),
  // A Sheffield joiner's loft conversion, less the deposit.
  contractor: sampleInvoice({
    ...POUNDS,
    number: "RJ-0219",
    theme: { ...invoiceDefault.theme, font: "ibm-plex-sans" },
    invoiceDate: "2026-10-23",
    dueDate: "2026-11-06",
    seller: party(
      "From",
      "Ridgeway Joinery Ltd\n12 Mowbray Street\nSheffield S3 8EN"
    ),
    client: party(
      "To",
      "Sam and Alex Whitlock\n9 Thornsett Road\nSheffield S7 1NB"
    ),
    shipping: party(
      "Job site",
      "Loft conversion\n9 Thornsett Road\nSheffield S7 1NB"
    ),
    items: items([
      ["Labour, joinery and first fix", 96, "hrs", 38],
      ["Labour, second fix", 34, "hrs", 38],
      ["Materials, timber and insulation", 1, "ea", 3180],
      ["Materials, staircase kit", 1, "ea", 1240],
      ["Disposal and site clean-up", 1, "ea", 260]
    ]),
    amountPaid: 2500,
    labels: { ...invoiceDefault.labels, amountPaid: "Deposit paid" },
    tax: { percentage: 20, exempt: false, note: "", perLine: false },
    paymentDetails: {
      label: "Payment details",
      bankName: "Lloyds Bank",
      accountNumber: "61240775",
      sortCode: "30-96-26",
      terms: "Balance due within 14 days of completion."
    }
  }),
  // A Cardiff grocer's wholesale order: goods taxed at different rates.
  retail: (() => {
    const invoice = sampleInvoice({
      ...POUNDS,
      number: "GG-1450",
      theme: { ...invoiceDefault.theme, font: "geist" },
      invoiceDate: "2026-10-26",
      dueDate: "2026-11-09",
      seller: party(
        "From",
        "Greengage Grocers Ltd\n23 Pontcanna Street\nCardiff CF11 9HQ"
      ),
      client: party("To", "The Copper Kettle\n4 High Street\nCardiff CF10 1AX"),
      items: items([
        ["Bottled sparkling water, case of 12", 10, "ea", 9.6],
        ["Home-compostable coffee cups, 500", 4, "ea", 38],
        ["Children's car seat liners", 2, "ea", 22],
        ["Sourdough loaves", 24, "ea", 3.4]
      ]),
      tax: { percentage: 20, exempt: false, note: "", perLine: true },
      fees: 12,
      labels: { ...invoiceDefault.labels, fees: "Delivery" }
    });
    const rates = [20, 20, 5, 0];

    return {
      ...invoice,
      items: invoice.items.map((item, index) => ({
        ...item,
        tax: { percentage: rates[index] ?? 0, exempt: false }
      }))
    };
  })()
};

// Renders the invoice's first page to a PNG at the homepage's render scale.
async function renderPage(directory: string, name: string, invoice: Invoice) {
  const pdfPath = join(directory, `${name}.pdf`);
  const pngPath = join(directory, name);

  await loadInvoicePdfFonts(invoice.theme);
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

// The template gallery's share card (PAGE_META.templates.image): the top of
// each template's page, three across and two down, on the same sky as the
// homepage's card (public/og-image.jpg).
const SHARE_CARD = { width: 1200, height: 630, margin: 40, gap: 28 };

// The sky every share card sits on, with the paper's shadows drawn on it.
function skyBackground(sheets: string) {
  const { width, height } = SHARE_CARD;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8ad5db"/>
          <stop offset="0.5" stop-color="#bdebeb"/>
          <stop offset="1" stop-color="#e2fbf8"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#sky)"/>
      ${sheets}
    </svg>`
  );
}

// A site template page's share card: the top of its one page on the sky.
async function writeSiteTemplateShareCard(pngPath: string, image: string) {
  const { width, height, margin } = SHARE_CARD;
  const sheetWidth = 560;
  const sheetHeight = height - margin * 2;
  const left = Math.round((width - sheetWidth) / 2);
  const shadow = `<rect x="${left}" y="${margin + 4}" width="${sheetWidth}" height="${sheetHeight}" rx="4" fill="rgb(16 60 90 / 0.18)" filter="url(#shadow)"/>`;
  const sheet = await sharp(pngPath)
    .resize({ width: sheetWidth })
    .extract({ left: 0, top: 0, width: sheetWidth, height: sheetHeight })
    .toBuffer();

  await sharp(skyBackground(shadow))
    .composite([{ input: sheet, left, top: margin }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(join(OUTPUT_DIR, new URL(image).pathname));
}

async function writeTemplatesShareCard(pngPaths: string[]) {
  const { width, height, margin, gap } = SHARE_CARD;
  const cellWidth = Math.floor((width - margin * 2 - gap * 2) / 3);
  const cellHeight = Math.floor((height - margin * 2 - gap) / 2);
  const left = Math.round((width - cellWidth * 3 - gap * 2) / 2);
  const top = Math.round((height - cellHeight * 2 - gap) / 2);
  const cells = pngPaths.map((pngPath, index) => ({
    pngPath,
    left: left + (index % 3) * (cellWidth + gap),
    top: top + Math.floor(index / 3) * (cellHeight + gap)
  }));
  const sheets = cells
    .map(
      cell =>
        `<rect x="${cell.left}" y="${cell.top + 4}" width="${cellWidth}" height="${cellHeight}" rx="4" fill="rgb(16 60 90 / 0.18)" filter="url(#shadow)"/>`
    )
    .join("");
  const background = skyBackground(sheets);
  const pages = await Promise.all(
    cells.map(async cell => ({
      input: await sharp(cell.pngPath)
        .resize({ width: cellWidth })
        .extract({ left: 0, top: 0, width: cellWidth, height: cellHeight })
        .composite([
          {
            input: Buffer.from(
              `<svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth}" height="${cellHeight}"><rect x="0.5" y="0.5" width="${cellWidth - 1}" height="${cellHeight - 1}" fill="none" stroke="rgb(0 0 0 / 0.08)"/></svg>`
            )
          }
        ])
        .toBuffer(),
      left: cell.left,
      top: cell.top
    }))
  );

  await sharp(background)
    .composite(pages)
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(join(OUTPUT_DIR, new URL(PAGE_META.templates.image).pathname));
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

  await mkdir(join(OUTPUT_DIR, "templates"), { recursive: true });

  const templatePngPaths: string[] = [];

  for (const template of INVOICE_TEMPLATES) {
    const invoice = TEMPLATE_INVOICES[template.id];
    const pngPath = await renderPage(directory, template.id, {
      ...invoice,
      theme: { ...invoice.theme, font: template.font }
    });

    templatePngPaths.push(pngPath);

    for (const width of TEMPLATE_RENDER_WIDTHS) {
      await writeWebp({
        pngPath,
        src: templateSrc(template, width),
        width
      });
    }
  }

  await writeTemplatesShareCard(templatePngPaths);

  for (const template of SITE_TEMPLATES) {
    const invoice = SITE_TEMPLATE_INVOICES[template.id];
    const pngPath = await renderPage(directory, template.id, invoice);

    for (const width of TEMPLATE_RENDER_WIDTHS) {
      await writeWebp({ pngPath, src: templateSrc(template, width), width });
    }

    await writeSiteTemplateShareCard(pngPath, PAGE_META[template.id].image);
  }

  process.stdout.write(
    `Wrote the invoice renders to ${join(OUTPUT_DIR, "home")} and ${join(OUTPUT_DIR, "templates")}, and the template gallery's share card\n`
  );
} finally {
  if (process.argv.includes("--keep")) {
    process.stdout.write(`Kept the page renders in ${directory}\n`);
  } else {
    await rm(directory, { recursive: true, force: true });
  }
}
