import { describe, expect, it } from "vitest";
import { getLocaleDefaults } from "~/utils/locale-defaults";

describe("getLocaleDefaults", () => {
  it.each([
    ["en-US", "comma-dot", "before", "Letter"],
    ["en-GB", "comma-dot", "before", "A4"],
    ["de-DE", "dot-comma", "after", "A4"],
    ["de-AT", "dot-comma", "before", "A4"],
    ["fr-FR", "space-comma", "after", "A4"],
    ["de-CH", "apostrophe-dot", "before", "A4"],
    ["en-IN", "indian", "before", "A4"],
    ["ja", "comma-dot", "before", "A4"],
    ["fr-CA", "space-comma", "after", "Letter"],
    ["en-CA", "comma-dot", "before", "Letter"],
    ["nl-BE", "dot-comma", "before", "A4"],
    ["zh-Hant-TW", "comma-dot", "before", "A4"]
  ])(
    "reads %s as %s, %s, %s",
    (tag, numberFormat, currencyPosition, paperSize) => {
      expect(getLocaleDefaults(tag)).toEqual({
        numberFormat,
        currencyPosition,
        paperSize
      });
    }
  );

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

  it("falls back to the stored defaults for an unknown or missing tag", () => {
    const stored = {
      numberFormat: "comma-dot",
      currencyPosition: "before",
      paperSize: "A4"
    };

    expect(getLocaleDefaults(undefined)).toEqual(stored);
    expect(getLocaleDefaults("")).toEqual(stored);
    expect(getLocaleDefaults("xx")).toEqual(stored);
    expect(getLocaleDefaults("not a tag")).toEqual(stored);
  });
});
