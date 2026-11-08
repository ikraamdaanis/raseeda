import type { SiteTemplateId } from "~/types";

// The site's pages that open the editor ready for one job (issue #131): one
// for each document type besides the invoice, whose page is the template
// gallery, and one for each trade whose invoice differs in a real way. What
// each opens is utils/site-template.ts. A page only belongs here if its
// template differs from the others (PRODUCT.md's Scope): no pages per country
// or city. The pictures are real PDFs of finished samples, rendered by
// scripts/render-homepage-invoices.tsx, so they show the template in use
// rather than the empty one it opens.
export const SITE_TEMPLATES = [
  {
    id: "quote",
    path: "/quote-template",
    group: "document",
    name: "Quote template",
    heading: "Free quote template",
    summary: "A price to agree before the work starts, valid until a date.",
    intro:
      "Give a client the price before the work starts. Fill in your details and the job, then download your quote as a PDF. Free, with no account.",
    startLabel: "Start a quote",
    whenHeading: "When to send a quote",
    when: "Before the work or the sale, so the client can say yes to a price. When they do, duplicate the quote as an invoice and the lines come with it.",
    includes: [
      "A quote number, starting at QUO-0001",
      "A Valid until date, 30 days out to begin with",
      "Line items with quantity, unit and price, totalled as you type",
      "Tax, discounts and fees",
      "No amount paid and no PAID stamp, since nothing is owed yet"
    ],
    src: "/templates/quote-template.webp",
    alt: "A quote from Fernway Landscapes in Bristol to Harbour Row Apartments for a courtyard redesign, valid for 30 days"
  },
  {
    id: "proforma-invoice",
    path: "/proforma-invoice-template",
    group: "document",
    name: "Proforma invoice template",
    heading: "Free proforma invoice template",
    summary: "What an order will cost, to pay up front or clear customs.",
    intro:
      "Set out what an order will cost before you bill for it. Fill in the goods and the terms, then download your proforma invoice as a PDF. Free, with no account.",
    startLabel: "Start a proforma invoice",
    whenHeading: "When to send a proforma invoice",
    when: "Before the goods ship or the work is done, when the buyer needs a document to pay a deposit from or to clear customs. When the sale goes through, duplicate it as an invoice.",
    includes: [
      "A proforma number, starting at PRO-0001",
      "A due date for payment up front",
      "Line items, tax, discounts and fees",
      "Your bank details, or other ways to pay",
      "No PAID stamp, since this isn't the final bill"
    ],
    src: "/templates/proforma-invoice-template.webp",
    alt: "A proforma invoice from Tessera Ceramics in Lisbon to Nordhavn Interiors in Copenhagen for an order of glazed tiles"
  },
  {
    id: "receipt",
    path: "/receipt-template",
    group: "document",
    name: "Receipt template",
    heading: "Free receipt template",
    summary: "Proof of a payment, with the date paid and who paid.",
    intro:
      "Show that a payment came in. Fill in what was bought and who paid, then download your receipt as a PDF. Free, with no account.",
    startLabel: "Start a receipt",
    whenHeading: "When to give a receipt",
    when: "After you've been paid. A receipt starts out paid in full, so it has no payment details or late fees to print.",
    includes: [
      "A receipt number, starting at REC-0001",
      "The date paid, set to today to begin with",
      "Who paid, printed under the date",
      "What was bought, with tax, discounts and fees",
      "The amount paid, in full unless you type less"
    ],
    src: "/templates/receipt-template.webp",
    alt: "A receipt from Copperleaf Yoga in Toronto to Priya Nair for a class pass, paid in full by card"
  },
  {
    id: "credit-note",
    path: "/credit-note-template",
    group: "document",
    name: "Credit note template",
    heading: "Free credit note template",
    summary: "Money back off an invoice you've already sent.",
    intro:
      "Take money off an invoice you've already sent, for a return, an overcharge or a mistake. Name the invoice, list the credit and download a PDF. Free, with no account.",
    startLabel: "Start a credit note",
    whenHeading: "When to issue a credit note",
    when: "When an invoice needs correcting after it has gone out. Leave the invoice as it is, and issue a credit note that names it.",
    includes: [
      "A credit note number, starting at CN-0001",
      "A Refers to invoice line naming the invoice it corrects",
      "What's being credited, with tax, discounts and fees",
      "A Total credit in place of a balance due",
      "No due date or payment details, since nothing is owed to you"
    ],
    src: "/templates/credit-note-template.webp",
    alt: "A credit note from Oakline Office Supply in Leeds to Brightwater Dental, crediting two returned chairs against an earlier invoice"
  },
  {
    id: "freelance",
    path: "/freelance-invoice-template",
    group: "trade",
    name: "Freelance invoice template",
    heading: "Free freelance invoice template",
    summary: "Hours and a rate on every line, for work billed by the hour.",
    intro:
      "Bill by the hour. The columns already read Hours and Rate, with lines ready for the work you did. Add your details and download a PDF. Free, with no account.",
    startLabel: "Start a freelance invoice",
    whenHeading: "When it fits",
    when: "For work charged by the hour, such as design, writing, development or consulting. Each line says what you did, how long it took and your rate, so a client can see what they're paying for.",
    includes: [
      "Hours and Rate columns in place of Quantity and Unit Price",
      "Lines for project work, meetings and revisions, ready to rename",
      "A service period for the dates the work covers",
      "Each line's amount worked out from its hours and rate",
      "Your bank details, or other ways to pay"
    ],
    src: "/templates/freelance-template.webp",
    alt: "A freelance invoice from Tom Adeyemi in Manchester to Lark Studio, listing hours of development, meetings and revisions at an hourly rate"
  },
  {
    id: "contractor",
    path: "/contractor-invoice-template",
    group: "trade",
    name: "Contractor invoice template",
    heading: "Free contractor invoice template",
    summary: "Labour and materials on separate lines, with a job site.",
    intro:
      "Keep labour and materials on separate lines, so a client can see what the job cost. Add your rates and download a PDF. Free, with no account.",
    startLabel: "Start a contractor invoice",
    whenHeading: "When it fits",
    when: "For building, trade and repair work billed at the end of a job or in stages. Separate lines for labour and materials head off arguments over a single lump sum, and the job site sits apart from the billing address.",
    includes: [
      "Separate lines for labour by the hour and materials by the piece",
      "A job site address beside the client's",
      "The deposit already paid, taken off the balance due",
      "Tax, discounts and fees",
      "Your bank details, or other ways to pay"
    ],
    src: "/templates/contractor-template.webp",
    alt: "A contractor invoice from Ridgeway Joinery in Sheffield for a loft conversion, with labour and materials on separate lines and a deposit paid"
  },
  {
    id: "retail",
    path: "/retail-invoice-template",
    group: "trade",
    name: "Retail invoice template",
    heading: "Free retail invoice template",
    summary: "A tax rate on each line, for goods not all taxed the same.",
    intro:
      "Put a different tax rate on each line, for sellers whose goods aren't all taxed the same. Type your products and rates, then download a PDF. Free, with no account.",
    startLabel: "Start a retail invoice",
    whenHeading: "When it fits",
    when: "For sales where some goods are taxed at a different rate or not at all. Type each line's rate, or mark a line exempt, and the totals follow.",
    includes: [
      "A tax rate on every line, with a Tax column on the page",
      "Lines by the piece, ready for your products",
      "Exempt lines, with room for a tax note",
      "Each rate's tax added up into the total",
      "Discounts and a delivery fee"
    ],
    src: "/templates/retail-template.webp",
    alt: "A retail invoice from Greengage Grocers in Cardiff to The Copper Kettle, with a different tax rate on each line of goods"
  }
] as const satisfies readonly {
  id: SiteTemplateId;
  path: string;
  group: "document" | "trade";
  name: string;
  heading: string;
  summary: string;
  intro: string;
  startLabel: string;
  whenHeading: string;
  when: string;
  includes: readonly string[];
  src: string;
  alt: string;
}[];
