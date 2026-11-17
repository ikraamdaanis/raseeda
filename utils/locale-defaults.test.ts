import { describe, expect, it } from "vitest";
import { getLocaleDefaults } from "~/utils/locale-defaults";

describe("getLocaleDefaults", () => {
  it.each([
    ["en-US", "$", "USD", "comma-dot", "before", "Letter", "en"],
    ["en-GB", "£", "GBP", "comma-dot", "before", "A4", "en"],
    ["de-DE", "€", "EUR", "dot-comma", "after", "A4", "de"],
    ["de-AT", "€", "EUR", "dot-comma", "before", "A4", "de"],
    ["fr-FR", "€", "EUR", "space-comma", "after", "A4", "fr"],
    ["de-CH", "CHF", "CHF", "apostrophe-dot", "before", "A4", "de"],
    ["en-IN", "₹", "INR", "indian", "before", "A4", "en"],
    ["ja", "¥", "JPY", "comma-dot", "before", "A4", "en"],
    ["fr-CA", "$", "CAD", "space-comma", "after", "Letter", "fr"],
    ["en-CA", "$", "CAD", "comma-dot", "before", "Letter", "en"],
    ["nl-BE", "€", "EUR", "dot-comma", "before", "A4", "nl"],
    ["zh-Hant-TW", "$", "TWD", "comma-dot", "before", "A4", "en"]
  ])(
    "reads %s as %s %s, %s, %s, %s, %s",
    (
      tag,
      currency,
      currencyCode,
      numberFormat,
      currencyPosition,
      paperSize,
      language
    ) => {
      expect(getLocaleDefaults(tag)).toEqual({
        currency,
        currencyCode,
        numberFormat,
        currencyPosition,
        paperSize,
        language
      });
    }
  );

  it("starts the labels in the browser's language when there's a preset", () => {
    expect(getLocaleDefaults("es-MX").language).toBe("es");
    expect(getLocaleDefaults("pt-BR").language).toBe("pt");
    expect(getLocaleDefaults("pl").language).toBe("pl");
    expect(getLocaleDefaults("it-CH").language).toBe("it");
    expect(getLocaleDefaults("sv-SE").language).toBe("en");
  });

  it("fills in a language's most common region when the tag has none", () => {
    expect(getLocaleDefaults("de")).toEqual(getLocaleDefaults("de-DE"));
    expect(getLocaleDefaults("pt")).toEqual(getLocaleDefaults("pt-BR"));
    expect(getLocaleDefaults("en")).toEqual(getLocaleDefaults("en-US"));
  });

  it("reads underscores as hyphens", () => {
    expect(getLocaleDefaults("de_DE")).toEqual(getLocaleDefaults("de-DE"));
  });

  it("picks Letter in CLDR's Letter territories, A4 everywhere else", () => {
    expect(getLocaleDefaults("es-MX").paperSize).toBe("Letter");
    expect(getLocaleDefaults("es-CO").paperSize).toBe("Letter");
    expect(getLocaleDefaults("fil-PH").paperSize).toBe("Letter");
    expect(getLocaleDefaults("en-AU").paperSize).toBe("A4");
    expect(getLocaleDefaults("es-ES").paperSize).toBe("A4");
    expect(getLocaleDefaults("es-AR").paperSize).toBe("A4");
  });

  it("bills in the region's currency, with Intl's symbol for one that isn't a preset", () => {
    expect(getLocaleDefaults("pl-PL")).toMatchObject({
      currency: "zł",
      currencyCode: "PLN"
    });
    expect(getLocaleDefaults("pt")).toMatchObject({
      currency: "R$",
      currencyCode: "BRL"
    });
    expect(getLocaleDefaults("en-AU")).toMatchObject({
      currency: "$",
      currencyCode: "AUD"
    });
    expect(getLocaleDefaults("bg-BG")).toMatchObject({
      currency: "€",
      currencyCode: "EUR"
    });
  });

  it("bills in US dollars where the region isn't listed", () => {
    expect(getLocaleDefaults("es-EC")).toMatchObject({
      currency: "$",
      currencyCode: "USD"
    });
  });

  it("falls back to the stored defaults for an unknown or missing tag", () => {
    const stored = {
      currency: "$",
      currencyCode: "USD",
      numberFormat: "comma-dot",
      currencyPosition: "before",
      paperSize: "A4",
      language: "en"
    };

    expect(getLocaleDefaults(undefined)).toEqual(stored);
    expect(getLocaleDefaults("")).toEqual(stored);
    expect(getLocaleDefaults("xx")).toEqual(stored);
    expect(getLocaleDefaults("not a tag")).toEqual(stored);
  });
});
