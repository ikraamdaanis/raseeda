import type { DocumentType, LabelLanguage } from "~/types";

// The languages a language preset sets every printed label in (issue #126),
// in the order the inspector lists them. English is the labels a new invoice
// has always had. Adding a language is a column below.
export const LABEL_LANGUAGES = [
  "en",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "pt",
  "pl"
] as const;

// What the inspector calls each language: its English name, then its own.
export const LABEL_LANGUAGE_NAMES = {
  en: "English",
  de: "German · Deutsch",
  fr: "French · Français",
  es: "Spanish · Español",
  it: "Italian · Italiano",
  nl: "Dutch · Nederlands",
  pt: "Portuguese · Português",
  pl: "Polish · Polski"
} as const satisfies Record<LabelLanguage, string>;

// Every printed label that's the same whatever the document type, a row per
// label and a column per language, in each country's usual invoice wording
// (German follows section 14 UStG: Leistungsdatum, Leistungszeitraum). The
// Tax column stays blank in every language, so it reads as the tax row's
// label; the Amount column is blank in English only, where it reads "Net
// amount" or "Amount" by whether tax is charged.
export const LABEL_PRESETS = {
  seller: {
    en: "From",
    de: "Von",
    fr: "De",
    es: "De",
    it: "Da",
    nl: "Van",
    pt: "De",
    pl: "Sprzedawca"
  },
  client: {
    en: "To",
    de: "An",
    fr: "À",
    es: "Para",
    it: "A",
    nl: "Aan",
    pt: "Para",
    pl: "Nabywca"
  },
  shipping: {
    en: "Ship to",
    de: "Lieferadresse",
    fr: "Livrer à",
    es: "Enviar a",
    it: "Spedire a",
    nl: "Afleveradres",
    pt: "Entregar em",
    pl: "Adres dostawy"
  },
  poNumber: {
    en: "PO number",
    de: "Bestellnummer",
    fr: "N° de commande",
    es: "N.º de pedido",
    it: "N. ordine",
    nl: "Ordernummer",
    pt: "N.º do pedido",
    pl: "Nr zamówienia"
  },
  servicePeriod: {
    en: "Service period",
    de: "Leistungszeitraum",
    fr: "Période de prestation",
    es: "Periodo de servicio",
    it: "Periodo di prestazione",
    nl: "Prestatieperiode",
    pt: "Período de prestação",
    pl: "Okres świadczenia usług"
  },
  supplyDate: {
    en: "Date of supply",
    de: "Leistungsdatum",
    fr: "Date de livraison",
    es: "Fecha de operación",
    it: "Data dell'operazione",
    nl: "Leveringsdatum",
    pt: "Data de fornecimento",
    pl: "Data sprzedaży"
  },
  subtotal: {
    en: "Subtotal",
    de: "Zwischensumme",
    fr: "Sous-total",
    es: "Subtotal",
    it: "Subtotale",
    nl: "Subtotaal",
    pt: "Subtotal",
    pl: "Suma częściowa"
  },
  tax: {
    en: "Tax",
    de: "MwSt.",
    fr: "TVA",
    es: "IVA",
    it: "IVA",
    nl: "Btw",
    pt: "Imposto",
    pl: "VAT"
  },
  fees: {
    en: "Fees",
    de: "Gebühren",
    fr: "Frais",
    es: "Cargos",
    it: "Spese",
    nl: "Kosten",
    pt: "Taxas",
    pl: "Opłaty"
  },
  discounts: {
    en: "Discounts",
    de: "Rabatt",
    fr: "Remise",
    es: "Descuento",
    it: "Sconto",
    nl: "Korting",
    pt: "Desconto",
    pl: "Rabat"
  },
  amountPaid: {
    en: "Amount paid",
    de: "Bereits bezahlt",
    fr: "Montant payé",
    es: "Importe pagado",
    it: "Importo pagato",
    nl: "Betaald bedrag",
    pt: "Valor pago",
    pl: "Zapłacono"
  },
  balanceDue: {
    en: "Balance due",
    de: "Offener Betrag",
    fr: "Reste à payer",
    es: "Saldo pendiente",
    it: "Saldo da pagare",
    nl: "Openstaand bedrag",
    pt: "Saldo a pagar",
    pl: "Pozostało do zapłaty"
  },
  refersTo: {
    en: "Refers to invoice",
    de: "Bezieht sich auf Rechnung",
    fr: "Facture d'origine",
    es: "Factura rectificada",
    it: "Rif. fattura",
    nl: "Betreft factuur",
    pt: "Refere-se à fatura",
    pl: "Dotyczy faktury"
  },
  paidBy: {
    en: "Paid by",
    de: "Zahlungsart",
    fr: "Mode de paiement",
    es: "Forma de pago",
    it: "Metodo di pagamento",
    nl: "Betaalwijze",
    pt: "Forma de pagamento",
    pl: "Forma płatności"
  },
  descriptionColumn: {
    en: "Item",
    de: "Beschreibung",
    fr: "Description",
    es: "Concepto",
    it: "Descrizione",
    nl: "Omschrijving",
    pt: "Descrição",
    pl: "Nazwa"
  },
  quantityColumn: {
    en: "Quantity",
    de: "Menge",
    fr: "Quantité",
    es: "Cantidad",
    it: "Quantità",
    nl: "Aantal",
    pt: "Quantidade",
    pl: "Ilość"
  },
  unitColumn: {
    en: "Unit",
    de: "Einheit",
    fr: "Unité",
    es: "Unidad",
    it: "Unità",
    nl: "Eenheid",
    pt: "Unidade",
    pl: "J.m."
  },
  unitPriceColumn: {
    en: "Unit Price",
    de: "Einzelpreis",
    fr: "Prix unitaire",
    es: "Precio unitario",
    it: "Prezzo unitario",
    nl: "Stukprijs",
    pt: "Preço unitário",
    pl: "Cena jedn."
  },
  taxColumn: {
    en: "",
    de: "",
    fr: "",
    es: "",
    it: "",
    nl: "",
    pt: "",
    pl: ""
  },
  amountColumn: {
    en: "",
    de: "Betrag",
    fr: "Montant",
    es: "Importe",
    it: "Importo",
    nl: "Bedrag",
    pt: "Valor",
    pl: "Wartość"
  },
  paymentDetails: {
    en: "Payment details",
    de: "Zahlungsinformationen",
    fr: "Informations de paiement",
    es: "Datos de pago",
    it: "Dati di pagamento",
    nl: "Betaalgegevens",
    pt: "Dados de pagamento",
    pl: "Dane do płatności"
  },
  bankName: {
    en: "Bank name",
    de: "Bank",
    fr: "Banque",
    es: "Banco",
    it: "Banca",
    nl: "Bank",
    pt: "Banco",
    pl: "Bank"
  },
  accountName: {
    en: "Account name",
    de: "Kontoinhaber",
    fr: "Titulaire du compte",
    es: "Titular de la cuenta",
    it: "Intestatario del conto",
    nl: "Rekeninghouder",
    pt: "Titular da conta",
    pl: "Właściciel rachunku"
  },
  accountNumber: {
    en: "Account number",
    de: "Kontonummer",
    fr: "Numéro de compte",
    es: "Número de cuenta",
    it: "Numero di conto",
    nl: "Rekeningnummer",
    pt: "Número da conta",
    pl: "Numer rachunku"
  },
  routingNumber: {
    en: "Routing number",
    de: "Bankleitzahl",
    fr: "Code banque",
    es: "Código bancario",
    it: "Codice bancario",
    nl: "Bankcode",
    pt: "Código do banco",
    pl: "Numer rozliczeniowy"
  },
  iban: {
    en: "IBAN",
    de: "IBAN",
    fr: "IBAN",
    es: "IBAN",
    it: "IBAN",
    nl: "IBAN",
    pt: "IBAN",
    pl: "IBAN"
  },
  bic: {
    en: "BIC / SWIFT",
    de: "BIC / SWIFT",
    fr: "BIC / SWIFT",
    es: "BIC / SWIFT",
    it: "BIC / SWIFT",
    nl: "BIC / SWIFT",
    pt: "BIC / SWIFT",
    pl: "BIC / SWIFT"
  },
  sortCode: {
    en: "Sort code",
    de: "Sort Code",
    fr: "Code guichet",
    es: "Código de sucursal",
    it: "Codice filiale",
    nl: "Sort code",
    pt: "Código da agência",
    pl: "Kod oddziału"
  },
  paymentLink: {
    en: "Pay online",
    de: "Online bezahlen",
    fr: "Payer en ligne",
    es: "Pagar en línea",
    it: "Paga online",
    nl: "Online betalen",
    pt: "Pagar online",
    pl: "Zapłać online"
  },
  terms: {
    en: "Terms and conditions",
    de: "Geschäftsbedingungen",
    fr: "Conditions générales",
    es: "Términos y condiciones",
    it: "Termini e condizioni",
    nl: "Voorwaarden",
    pt: "Termos e condições",
    pl: "Warunki"
  },
  notes: {
    en: "Notes",
    de: "Anmerkungen",
    fr: "Remarques",
    es: "Notas",
    it: "Note",
    nl: "Opmerkingen",
    pt: "Notas",
    pl: "Uwagi"
  },
  latePayment: {
    en: "Late payment",
    de: "Zahlungsverzug",
    fr: "Pénalités de retard",
    es: "Recargo por demora",
    it: "Interessi di mora",
    nl: "Te late betaling",
    pt: "Pagamento em atraso",
    pl: "Odsetki za zwłokę"
  }
} as const satisfies Record<string, Record<LabelLanguage, string>>;

// The labels that differ by document type as well as by language: the title,
// the number's and dates' names and the total. The English column is
// DOCUMENT_TYPE_DEFAULTS' (consts/document-types.ts).
export const DOCUMENT_TYPE_LABEL_PRESETS = {
  invoice: {
    title: {
      en: "Invoice",
      de: "Rechnung",
      fr: "Facture",
      es: "Factura",
      it: "Fattura",
      nl: "Factuur",
      pt: "Fatura",
      pl: "Faktura"
    },
    invoiceNumber: {
      en: "Invoice No.",
      de: "Rechnungsnummer",
      fr: "Facture n°",
      es: "N.º de factura",
      it: "Fattura n.",
      nl: "Factuurnummer",
      pt: "Fatura n.º",
      pl: "Numer faktury"
    },
    invoiceDate: {
      en: "Date",
      de: "Rechnungsdatum",
      fr: "Date d'émission",
      es: "Fecha de emisión",
      it: "Data",
      nl: "Factuurdatum",
      pt: "Data de emissão",
      pl: "Data wystawienia"
    },
    paymentDue: {
      en: "Due date",
      de: "Fälligkeitsdatum",
      fr: "Date d'échéance",
      es: "Fecha de vencimiento",
      it: "Scadenza",
      nl: "Vervaldatum",
      pt: "Data de vencimento",
      pl: "Termin płatności"
    },
    total: {
      en: "Total",
      de: "Gesamtbetrag",
      fr: "Total",
      es: "Total",
      it: "Totale",
      nl: "Totaal",
      pt: "Total",
      pl: "Razem"
    }
  },
  quote: {
    title: {
      en: "Quote",
      de: "Angebot",
      fr: "Devis",
      es: "Presupuesto",
      it: "Preventivo",
      nl: "Offerte",
      pt: "Orçamento",
      pl: "Oferta"
    },
    invoiceNumber: {
      en: "Quote No.",
      de: "Angebotsnummer",
      fr: "Devis n°",
      es: "N.º de presupuesto",
      it: "Preventivo n.",
      nl: "Offertenummer",
      pt: "Orçamento n.º",
      pl: "Numer oferty"
    },
    invoiceDate: {
      en: "Date",
      de: "Angebotsdatum",
      fr: "Date d'émission",
      es: "Fecha de emisión",
      it: "Data",
      nl: "Offertedatum",
      pt: "Data de emissão",
      pl: "Data wystawienia"
    },
    paymentDue: {
      en: "Valid until",
      de: "Gültig bis",
      fr: "Valable jusqu'au",
      es: "Válido hasta",
      it: "Valido fino al",
      nl: "Geldig tot",
      pt: "Válido até",
      pl: "Ważna do"
    },
    total: {
      en: "Total",
      de: "Gesamtbetrag",
      fr: "Total",
      es: "Total",
      it: "Totale",
      nl: "Totaal",
      pt: "Total",
      pl: "Razem"
    }
  },
  "proforma-invoice": {
    title: {
      en: "Proforma invoice",
      de: "Proformarechnung",
      fr: "Facture proforma",
      es: "Factura proforma",
      it: "Fattura proforma",
      nl: "Proformafactuur",
      pt: "Fatura pró-forma",
      pl: "Faktura proforma"
    },
    invoiceNumber: {
      en: "Proforma No.",
      de: "Proforma-Nummer",
      fr: "Proforma n°",
      es: "N.º de proforma",
      it: "Proforma n.",
      nl: "Proformanummer",
      pt: "Pró-forma n.º",
      pl: "Numer proformy"
    },
    invoiceDate: {
      en: "Date",
      de: "Datum",
      fr: "Date d'émission",
      es: "Fecha de emisión",
      it: "Data",
      nl: "Datum",
      pt: "Data de emissão",
      pl: "Data wystawienia"
    },
    paymentDue: {
      en: "Due date",
      de: "Fälligkeitsdatum",
      fr: "Date d'échéance",
      es: "Fecha de vencimiento",
      it: "Scadenza",
      nl: "Vervaldatum",
      pt: "Data de vencimento",
      pl: "Termin płatności"
    },
    total: {
      en: "Total",
      de: "Gesamtbetrag",
      fr: "Total",
      es: "Total",
      it: "Totale",
      nl: "Totaal",
      pt: "Total",
      pl: "Razem"
    }
  },
  receipt: {
    title: {
      en: "Receipt",
      de: "Quittung",
      fr: "Reçu",
      es: "Recibo",
      it: "Ricevuta",
      nl: "Kwitantie",
      pt: "Recibo",
      pl: "Pokwitowanie"
    },
    invoiceNumber: {
      en: "Receipt No.",
      de: "Quittungsnummer",
      fr: "Reçu n°",
      es: "N.º de recibo",
      it: "Ricevuta n.",
      nl: "Kwitantienummer",
      pt: "Recibo n.º",
      pl: "Numer pokwitowania"
    },
    invoiceDate: {
      en: "Date",
      de: "Datum",
      fr: "Date d'émission",
      es: "Fecha de emisión",
      it: "Data",
      nl: "Datum",
      pt: "Data de emissão",
      pl: "Data wystawienia"
    },
    paymentDue: {
      en: "Date paid",
      de: "Bezahlt am",
      fr: "Date de paiement",
      es: "Fecha de pago",
      it: "Data di pagamento",
      nl: "Betaaldatum",
      pt: "Data de pagamento",
      pl: "Data zapłaty"
    },
    total: {
      en: "Total",
      de: "Gesamtbetrag",
      fr: "Total",
      es: "Total",
      it: "Totale",
      nl: "Totaal",
      pt: "Total",
      pl: "Razem"
    }
  },
  "credit-note": {
    title: {
      en: "Credit note",
      de: "Rechnungskorrektur",
      fr: "Avoir",
      es: "Factura rectificativa",
      it: "Nota di credito",
      nl: "Creditnota",
      pt: "Nota de crédito",
      pl: "Faktura korygująca"
    },
    invoiceNumber: {
      en: "Credit note No.",
      de: "Korrekturnummer",
      fr: "Avoir n°",
      es: "N.º de rectificativa",
      it: "Nota di credito n.",
      nl: "Creditnotanummer",
      pt: "Nota de crédito n.º",
      pl: "Numer korekty"
    },
    invoiceDate: {
      en: "Date",
      de: "Datum",
      fr: "Date d'émission",
      es: "Fecha de emisión",
      it: "Data",
      nl: "Datum",
      pt: "Data de emissão",
      pl: "Data wystawienia"
    },
    paymentDue: {
      en: "Due date",
      de: "Fälligkeitsdatum",
      fr: "Date d'échéance",
      es: "Fecha de vencimiento",
      it: "Scadenza",
      nl: "Vervaldatum",
      pt: "Data de vencimento",
      pl: "Termin płatności"
    },
    total: {
      en: "Total credit",
      de: "Korrekturbetrag",
      fr: "Total de l'avoir",
      es: "Total rectificado",
      it: "Totale credito",
      nl: "Totaal credit",
      pt: "Total do crédito",
      pl: "Kwota korekty"
    }
  }
} as const satisfies Record<
  DocumentType,
  Record<
    "title" | "invoiceNumber" | "invoiceDate" | "paymentDue" | "total",
    Record<LabelLanguage, string>
  >
>;
