import { Font, renderToFile } from "@react-pdf/renderer";
import { spawn } from "bun";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CLOSING_RENDER,
  HERO_INVOICE_NUMBER,
  PDF_RENDER_SCALE,
  PDF_RENDERS
} from "~/components/home/pdf-renders";
import { InvoicePDF } from "~/components/pdf/invoice-generator";
import {
  INVOICE_TEMPLATES,
  TEMPLATE_RENDER_SIZE
} from "~/components/templates/invoice-templates";
import { invoiceDefault } from "~/stores/invoice-store";
import type { Invoice, InvoiceItem } from "~/types";
import { PDF_FONT_FAMILIES } from "~/utils/register-invoice-pdf-fonts";

// Renders the homepage's invoice pictures with the app's own PDF component, so
// every one is a real billsend PDF rather than a drawing of one. Each picture
// shows a different invoice. Run `bun run render:home` after changing the PDF
// layout or the samples; it needs poppler (pdftoppm) and cwebp on the PATH.

const OUTPUT_DIR = join(import.meta.dir, "..", "public");

// The sample businesses' logos: app-icon marks from Untitled UI's free logo
// set (untitledui.com/logos), free for commercial use without attribution; the
// companies are fictional. These are 384px PNG masters rasterised from their
// SVGs, flattened first: the bevel, rim, sheen and shadow effects are stripped
// and the mark made solid white, as a printed logo would be.
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

// A Brooklyn illustrator's commission for a Portland design shop, with a
// returning-client discount. The hero shows it inside the editor's window.
const HERO_INVOICE = sampleInvoice({
  number: HERO_INVOICE_NUMBER,
  invoiceDate: "2026-10-05",
  dueDate: "2026-11-04",
  seller: {
    label: "From",
    content: "Emma Collins Illustration\n214 Bergen Street\nBrooklyn, NY 11217",
    placeholder: ""
  },
  client: {
    label: "Bill to",
    content:
      "Harbor & Pine Co.\n1120 NW Couch Street, Suite 400\nPortland, OR 97209",
    placeholder: ""
  },
  // Enough rows that the table runs past the hero panel's foot at every
  // width, which shows down to about 670 page pixels on a phone.
  items: items([
    ["Editorial illustrations", 3, "pcs", 600],
    ["Cover artwork", 1, "pcs", 950],
    ["Spot illustrations", 6, "pcs", 175],
    ["Concept sketches", 4, "pcs", 120],
    ["Revisions", 3, "hrs", 85],
    ["Print and web license", 1, "ea", 400],
    ["Print-ready files", 1, "ea", 150],
    ["Social media versions", 1, "ea", 180]
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

// A print studio's menu job for a Manhattan restaurant: a percentage discount,
// New York City's 8.875% sales tax on the printed goods, and a delivery fee.
const TOTALS_INVOICE = sampleInvoice({
  number: "FF-2214",
  invoiceDate: "2026-09-18",
  dueDate: "2026-10-18",
  seller: {
    label: "From",
    content:
      "Ferro & Finch Studio\n55 Washington Street, Suite 712\nBrooklyn, NY 11201\n(347) 555-0119",
    placeholder: ""
  },
  client: {
    label: "Bill to",
    content: "Lucia’s Trattoria\n241 Mulberry Street\nNew York, NY 10012",
    placeholder: ""
  },
  items: items([
    ["Menu design and layout", 1, "ea", 1200],
    ["Printed menus, 11 × 17", 150, "pcs", 6.5],
    ["Window decals", 4, "pcs", 85]
  ]),
  discounts: 10,
  discountType: "percentage",
  tax: { percentage: 8.875, exempt: false, note: "" },
  fees: 45,
  labels: { ...invoiceDefault.labels, fees: "Delivery" }
});

// A San Diego bookkeeper's monthly retainer, paid by ACH or wire.
const PAYMENT_INVOICE = sampleInvoice({
  number: "CB-0387",
  invoiceDate: "2026-10-01",
  dueDate: "2026-10-31",
  servicePeriod: "Sep 1–30, 2026",
  seller: {
    label: "From",
    content:
      "Coastline Bookkeeping LLC\n3990 Old Town Avenue, Suite B-204\nSan Diego, CA 92110\n(619) 555-0148",
    placeholder: ""
  },
  client: {
    label: "Bill to",
    content:
      "Pacific Swell Surf Supply\n4836 Newport Avenue\nSan Diego, CA 92107",
    placeholder: ""
  },
  items: items([
    ["Monthly bookkeeping retainer", 1, "mo", 850],
    ["Payroll processing, 9 employees", 2, "runs", 95],
    ["Quarterly sales tax filing", 1, "ea", 175]
  ]),
  paymentDetails: {
    label: "Payment details",
    bankName: "Bank of America, N.A.",
    accountNumber: "3250 8874 1196",
    routingNumber: "121000358",
    iban: "",
    bic: "BOFAUS3N",
    sortCode: "",
    terms: "Due within 30 days."
  }
});

// A Seattle app studio's monthly invoice, filled out top to bottom.
const CLOSING_INVOICE = sampleInvoice({
  number: "NL-1042",
  invoiceDate: "2026-10-02",
  dueDate: "2026-11-01",
  servicePeriod: "Sep 1–30, 2026",
  seller: {
    label: "From",
    content:
      "Northline Software LLC\n2200 Western Avenue, Suite 300\nSeattle, WA 98121\nbilling@northline.dev",
    placeholder: ""
  },
  client: {
    label: "Bill to",
    content:
      "Cascade Outfitters Inc.\nAttn: Accounts Payable\n1400 Fourth Avenue, Floor 9\nSeattle, WA 98101",
    placeholder: ""
  },
  items: items([
    ["iOS app development", 64, "hrs", 145],
    ["Android app development", 48, "hrs", 145],
    ["QA and release support", 12, "hrs", 120],
    ["Push notification service, Sep", 1, "mo", 89]
  ]),
  paymentDetails: {
    label: "Payment details",
    bankName: "U.S. Bank",
    accountNumber: "1534 9082 7316",
    routingNumber: "125000105",
    iban: "",
    bic: "USBKUS44IMT",
    sortCode: "",
    terms: "Net 30."
  },
  notes: {
    label: "Notes",
    content: "Thanks for another great sprint. Release 4.2 shipped on Sep 29."
  },
  latePayment: {
    label: "Late payment",
    content: "Balances more than 30 days past due accrue 1.5% interest a month."
  }
});

// The template gallery's invoices (components/templates/invoice-templates.ts),
// one per line of work, each in its template's font.
const TEMPLATE_INVOICES: Partial<Record<string, Invoice>> = {
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
    tax: { percentage: 8.25, exempt: false, note: "" },
    fees: 35,
    labels: { ...invoiceDefault.labels, fees: "Delivery" },
    paymentDetails: {
      label: "Payment details",
      bankName: "Frost Bank",
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

const directory = await mkdtemp(join(tmpdir(), "billsend-renders-"));

try {
  await mkdir(join(OUTPUT_DIR, "home"), { recursive: true });

  await writeWebp({
    pngPath: await renderPage(directory, "hero", {
      ...HERO_INVOICE,
      image: join(LOGO_DIR, "magnolia.png")
    }),
    ...PDF_RENDERS.hero
  });

  await writeWebp({
    pngPath: await renderPage(directory, "totals", TOTALS_INVOICE),
    ...PDF_RENDERS.totals
  });
  await writeWebp({
    pngPath: await renderPage(directory, "payment", PAYMENT_INVOICE),
    ...PDF_RENDERS.payment
  });

  await writeWebp({
    pngPath: await renderPage(directory, "closing", {
      ...CLOSING_INVOICE,
      image: join(LOGO_DIR, "constellation.png")
    }),
    ...CLOSING_RENDER
  });

  await mkdir(join(OUTPUT_DIR, "templates"), { recursive: true });

  for (const template of INVOICE_TEMPLATES) {
    const invoice = TEMPLATE_INVOICES[template.id];

    if (!invoice) throw new Error(`No sample invoice for ${template.id}`);

    await writeWebp({
      pngPath: await renderPage(directory, template.id, {
        ...invoice,
        theme: { ...invoice.theme, font: template.font }
      }),
      src: template.src,
      width: TEMPLATE_RENDER_SIZE.width
    });
  }

  process.stdout.write(
    `Wrote the invoice renders to ${join(OUTPUT_DIR, "home")} and ${join(OUTPUT_DIR, "templates")}\n`
  );
} finally {
  if (process.argv.includes("--keep")) {
    process.stdout.write(`Kept the page renders in ${directory}\n`);
  } else {
    await rm(directory, { recursive: true, force: true });
  }
}
