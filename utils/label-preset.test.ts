import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPE_DEFAULTS } from "~/consts/document-types";
import {
  DOCUMENT_TYPE_LABEL_PRESETS,
  LABEL_LANGUAGES,
  LABEL_PRESETS
} from "~/consts/label-presets";
import { DOCUMENT_TYPES, STORED_INVOICE_FORMATS } from "~/schema/invoice";
import { createBlankDocument, invoiceDefault } from "~/stores/invoice-store";
import { buildInvoiceViewModel } from "~/utils/build-invoice-view-model";
import {
  applyLabelPreset,
  findLabelLanguage,
  rankLabelLanguages,
  readLabelLanguage
} from "~/utils/label-preset";
import { getPaymentRows } from "~/utils/payment-details";

function blank(documentType: (typeof DOCUMENT_TYPES)[number] = "invoice") {
  return createBlankDocument(documentType, STORED_INVOICE_FORMATS);
}

describe("label presets", () => {
  it("has English as the labels a new document has always had", () => {
    expect(applyLabelPreset(invoiceDefault, "en")).toEqual(invoiceDefault);

    for (const documentType of DOCUMENT_TYPES) {
      const typed = DOCUMENT_TYPE_LABEL_PRESETS[documentType];
      const defaults = DOCUMENT_TYPE_DEFAULTS[documentType];

      expect(typed.title.en).toBe(defaults.title);
      expect(typed.invoiceNumber.en).toBe(defaults.labels.invoiceNumber);
      expect(typed.paymentDue.en).toBe(defaults.labels.paymentDue);
      expect(typed.total.en).toBe(defaults.labels.total);
      const document = blank(documentType);

      expect(applyLabelPreset(document, "en")).toEqual(document);
    }
  });

  it("has a wording for every label in every language", () => {
    const rows = [
      ...Object.entries(LABEL_PRESETS),
      ...DOCUMENT_TYPES.flatMap(documentType =>
        Object.entries(DOCUMENT_TYPE_LABEL_PRESETS[documentType])
      )
    ];

    for (const [row, values] of rows) {
      for (const language of LABEL_LANGUAGES) {
        // The Tax column reads as the tax row's label, and English's Amount
        // column as "Net amount" or "Amount".
        const isBlankByDesign =
          row === "taxColumn" || (row === "amountColumn" && language === "en");

        expect(values[language] === "", `${row} in ${language}`).toBe(
          isBlankByDesign
        );
      }
    }
  });
});

describe("applyLabelPreset", () => {
  it("sets every printed label in the language", () => {
    const german = applyLabelPreset(
      {
        ...blank(),
        seller: { ...blank().seller, content: "Acme GmbH" },
        tableSettings: {
          ...blank().tableSettings,
          columnLabels: { ...blank().tableSettings.columnLabels, unit: "Hrs" }
        }
      },
      "de"
    );

    expect(german.title).toBe("Rechnung");
    expect(german.labels).toMatchObject({
      invoiceNumber: "Rechnungsnummer",
      invoiceDate: "Rechnungsdatum",
      supplyDate: "Leistungsdatum",
      servicePeriod: "Leistungszeitraum",
      tax: "MwSt.",
      total: "Gesamtbetrag"
    });
    expect(german.tableSettings.columnLabels).toEqual({
      description: "Beschreibung",
      quantity: "Menge",
      unit: "Einheit",
      unitPrice: "Einzelpreis",
      tax: "",
      amount: "Betrag"
    });
    expect(german.seller).toEqual({
      ...blank().seller,
      label: "Von",
      content: "Acme GmbH"
    });
    expect(german.client.label).toBe("An");
    expect(german.shipping.label).toBe("Lieferadresse");
    expect(german.paymentDetails.label).toBe("Zahlungsinformationen");
    expect(german.paymentDetails.labels.accountName).toBe("Kontoinhaber");
    expect(german.terms.label).toBe("Geschäftsbedingungen");
    expect(german.notes.label).toBe("Anmerkungen");
    expect(german.latePayment.label).toBe("Zahlungsverzug");
  });

  it("takes the document type's own wording", () => {
    const quote = applyLabelPreset(blank("quote"), "de");

    expect(quote.title).toBe("Angebot");
    expect(quote.labels.paymentDue).toBe("Gültig bis");
  });

  it("prints in the language wherever the invoice is drawn from", () => {
    const german = applyLabelPreset(
      {
        ...blank(),
        paymentDetails: { ...blank().paymentDetails, iban: "DE89 3704" }
      },
      "de"
    );
    const view = buildInvoiceViewModel(german);

    expect(view.detailRows.map(row => row.label)).toEqual([
      "Rechnungsnummer",
      "Bestellnummer",
      "Rechnungsdatum",
      "Fälligkeitsdatum",
      "Leistungszeitraum"
    ]);
    expect(
      view.summaryRows.filter(row => row.isVisible).map(row => row.label)
    ).toEqual(["Zwischensumme", "MwSt.", "Gesamtbetrag"]);
    expect(getPaymentRows(german.paymentDetails).at(0)?.label).toBe("IBAN");
  });
});

describe("findLabelLanguage", () => {
  it("names the language every label is still in", () => {
    expect(findLabelLanguage(blank())).toBe("en");
    expect(findLabelLanguage(applyLabelPreset(blank("receipt"), "pl"))).toBe(
      "pl"
    );
  });

  it("names none once a label is renamed", () => {
    const german = applyLabelPreset(blank(), "de");

    expect(
      findLabelLanguage({ ...german, notes: { ...german.notes, label: "PS" } })
    ).toBeNull();
  });
});

describe("rankLabelLanguages", () => {
  it("puts the language most of the labels are in first", () => {
    expect(rankLabelLanguages(applyLabelPreset(blank(), "fr")).at(0)).toBe(
      "fr"
    );
    expect(rankLabelLanguages(blank()).at(0)).toBe("en");
  });
});

describe("readLabelLanguage", () => {
  it("reads a preset language and calls anything else English", () => {
    expect(readLabelLanguage("de")).toBe("de");
    expect(readLabelLanguage("German")).toBe("en");
    expect(readLabelLanguage(undefined)).toBe("en");
  });
});
