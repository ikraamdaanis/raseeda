// What the phone form says about each part and field the page prints under a
// label that can be renamed (issue #213), so someone who renamed Due Date to
// Pay By, or never knew what a PO number was, still knows which part of the
// invoice they're in. Each note is one short, plain sentence that adds to its
// heading rather than repeating it, and only where it helps. `content` is the
// caption over what's typed, under the Label caption over the label.

// By the part's `data-field-area`.
export const PART_NOTES: Partial<
  Record<string, { heading: string; note: string; content?: string }>
> = {
  seller: {
    heading: "Your details",
    note: "Who it’s from: your name or business, address and contact details.",
    content: "Details"
  },
  client: {
    heading: "Your client",
    note: "Who it’s for: their name or business and address.",
    content: "Details"
  },
  shipping: {
    heading: "Shipping address",
    note: "Where the goods go, if not to your client’s address.",
    content: "Address"
  },
  notes: {
    heading: "Notes",
    note: "A thank-you or anything else your client should know.",
    content: "Text"
  },
  terms: {
    heading: "Terms and conditions",
    note: "What you and your client agree to, like refunds or who owns the work.",
    content: "Text"
  },
  latePayment: {
    heading: "Late payment",
    note: "What you charge if your client pays late.",
    content: "Text"
  },
  paymentDetails: {
    heading: "Payment details",
    note: "How your client can pay you."
  }
};

// By the path of the label the field prints under. A field left out (a line's
// fields, the column headers every line shares) keeps only its label.
export const FIELD_NOTES: Partial<
  Record<string, { note?: string; content: string }>
> = {
  "labels.invoiceNumber": {
    note: "Use each number only once, so you and your client can refer to it.",
    content: "Number"
  },
  "labels.refersTo": {
    note: "The number of the invoice this credit note corrects.",
    content: "Number"
  },
  "labels.poNumber": {
    note: "Your client’s purchase order or reference, if they gave you one.",
    content: "Reference"
  },
  "labels.invoiceDate": {
    note: "The date you issue it, usually today.",
    content: "Date"
  },
  "labels.supplyDate": {
    note: "When you delivered the goods or did the work, if not the issue date.",
    content: "Date"
  },
  "labels.paymentDue": {
    note: "The last day your client can pay on time.",
    content: "Date"
  },
  "labels.paidBy": {
    note: "How your client paid, like bank transfer or card.",
    content: "Method"
  },
  "labels.servicePeriod": {
    note: "The dates the work covers.",
    content: "Dates"
  },
  "paymentDetails.labels.bankName": { content: "Name" },
  "paymentDetails.labels.accountName": {
    note: "The name on your bank account.",
    content: "Name"
  },
  "paymentDetails.labels.accountNumber": { content: "Number" },
  "paymentDetails.labels.routingNumber": {
    note: "For payments from within the US.",
    content: "Number"
  },
  "paymentDetails.labels.iban": {
    note: "For payments from Europe and many other countries.",
    content: "Number"
  },
  "paymentDetails.labels.bic": {
    note: "For payments from other countries.",
    content: "Code"
  },
  "paymentDetails.labels.sortCode": {
    note: "For payments from within the UK.",
    content: "Code"
  },
  "paymentDetails.labels.paymentLink": {
    note: "A web address your client can pay at, like a PayPal or Stripe link.",
    content: "Web address"
  }
};
