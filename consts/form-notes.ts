// What the phone form says about each part and field the page prints under a
// label that can be renamed (issue #213), so someone who renamed Due Date to
// Pay By, or never knew what a PO number was, still knows which part of the
// invoice they're in. Each note is one short, plain sentence that adds to its
// heading rather than repeating it, and only where it helps. `isOneField`
// marks a part whose label heads its one field, so the two sit together.

// By the part's `data-field-area`.
export const PART_NOTES: Partial<
  Record<string, { heading: string; note: string; isOneField?: boolean }>
> = {
  seller: {
    heading: "Your details",
    note: "Who it’s from: your name or business, address and contact details.",
    isOneField: true
  },
  client: {
    heading: "Your client",
    note: "Who it’s for: their name or business and address.",
    isOneField: true
  },
  shipping: {
    heading: "Shipping address",
    note: "Where the goods go, if not to your client’s address.",
    isOneField: true
  },
  notes: {
    heading: "Notes",
    note: "A thank-you or anything else your client should know.",
    isOneField: true
  },
  terms: {
    heading: "Terms and conditions",
    note: "What you and your client agree to, like refunds or who owns the work.",
    isOneField: true
  },
  latePayment: {
    heading: "Late payment",
    note: "What you charge if your client pays late.",
    isOneField: true
  },
  paymentDetails: {
    heading: "Payment details",
    note: "How your client can pay you."
  }
};

// By the path of the label the field prints under. A field left out (a line's
// fields, the column headers every line shares) keeps only its label; one
// with no note still gets a heading over its label.
export const FIELD_NOTES: Partial<Record<string, { note?: string }>> = {
  "labels.invoiceNumber": {
    note: "Use each number only once, so you and your client can refer to it."
  },
  "labels.refersTo": {
    note: "The number of the invoice this credit note corrects."
  },
  "labels.poNumber": {
    note: "Your client’s purchase order or reference, if they gave you one."
  },
  "labels.invoiceDate": {
    note: "The date you issue it, usually today."
  },
  "labels.supplyDate": {
    note: "When you delivered the goods or did the work, if not the issue date."
  },
  "labels.paymentDue": {
    note: "The last day your client can pay on time."
  },
  "labels.paidBy": {
    note: "How your client paid, like bank transfer or card."
  },
  "labels.servicePeriod": {
    note: "The dates the work covers."
  },
  "paymentDetails.labels.bankName": {},
  "paymentDetails.labels.accountName": {
    note: "The name on your bank account."
  },
  "paymentDetails.labels.accountNumber": {},
  "paymentDetails.labels.routingNumber": {
    note: "For payments from within the US."
  },
  "paymentDetails.labels.iban": {
    note: "For payments from Europe and many other countries."
  },
  "paymentDetails.labels.bic": {
    note: "For payments from other countries."
  },
  "paymentDetails.labels.sortCode": {
    note: "For payments from within the UK."
  },
  "paymentDetails.labels.paymentLink": {
    note: "A web address your client can pay at, like a PayPal or Stripe link."
  }
};
