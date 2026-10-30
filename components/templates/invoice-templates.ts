import type { InvoiceFont } from "~/types";

// The template gallery's invoices: real billsend PDFs of six sample invoices,
// each for a different line of work and set in a different invoice font.
// scripts/render-homepage-invoices.tsx renders them (the samples live there)
// into public/templates at TEMPLATE_RENDER_SIZE. Each links to the editor's
// `?font=` hand-off, which starts a blank invoice in that face.

// The gallery shows a page no wider than about 360px, so it ships at a little
// over twice that. The height follows from the A4 page.
export const TEMPLATE_RENDER_SIZE = { width: 800, height: 1132 };

export const INVOICE_TEMPLATES: {
  id: string;
  name: string;
  font: InvoiceFont;
  description: string;
  src: string;
  alt: string;
}[] = [
  {
    id: "freelance",
    name: "Freelance",
    font: "dm-sans",
    description:
      "Project work and hourly rates on one page, for designers, writers and developers working alone.",
    src: "/templates/freelance.webp",
    alt: "A freelance invoice from Maya Okafor Design in Chicago to Brightloop Health, listing brand identity design and landing page hours"
  },
  {
    id: "consulting",
    name: "Consulting",
    font: "libre-baskerville",
    description:
      "A monthly retainer, workshop days and a PO number, with late payment terms spelled out.",
    src: "/templates/consulting.webp",
    alt: "A consulting invoice from Whitcombe Advisory Group in Boston to Kestrel Biologics, with a monthly strategy retainer and two days of leadership workshops"
  },
  {
    id: "small-business",
    name: "Small business",
    font: "geist",
    description:
      "Goods with sales tax and a delivery fee, for shops, cafés and caterers.",
    src: "/templates/small-business.webp",
    alt: "A small business invoice from Sunflour Bakery & Café in Austin to Lonestar Robotics, for breakfast catering with Texas sales tax and delivery"
  },
  {
    id: "contractor",
    name: "Contractor",
    font: "ibm-plex-sans",
    description:
      "Labor and materials, the job site address and the deposit already paid.",
    src: "/templates/contractor.webp",
    alt: "A contractor invoice from Summit Ridge Builders in Denver for a kitchen remodel, listing labor and materials with a deposit paid"
  },
  {
    id: "photography",
    name: "Photography",
    font: "lora",
    description:
      "A shoot, extras and prints, with the retainer taken off the balance.",
    src: "/templates/photography.webp",
    alt: "A photography invoice from Ashley Rivers Photography in Charleston for wedding coverage, an engagement session and an album"
  },
  {
    id: "web-development",
    name: "Web development",
    font: "jetbrains-mono",
    description:
      "Billable hours for a month of work, plus hosting and renewals at a flat rate.",
    src: "/templates/web-development.webp",
    alt: "A web development invoice from Pinecrest Code in Raleigh to Triangle Home Health Partners, listing development hours and monthly hosting"
  }
];
