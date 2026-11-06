import { describe, expect, it } from "vitest";
import { getLocaleDefaults } from "~/utils/locale-defaults";

describe("getLocaleDefaults", () => {
  it("reads the format and currency position from the browser's region", () => {
    expect(getLocaleDefaults("de-DE")).toEqual({
      numberFormat: "dot-comma",
      currencyPosition: "after"
    });
    expect(getLocaleDefaults("en-US")).toEqual({
      numberFormat: "comma-dot",
      currencyPosition: "before"
    });
    expect(getLocaleDefaults("de-AT")).toEqual({
      numberFormat: "dot-comma",
      currencyPosition: "before"
    });
    expect(getLocaleDefaults("fr-FR")).toEqual({
      numberFormat: "space-comma",
      currencyPosition: "after"
    });
    expect(getLocaleDefaults("de-CH")).toEqual({
      numberFormat: "apostrophe-dot",
      currencyPosition: "before"
    });
    expect(getLocaleDefaults("en-IN")).toEqual({
      numberFormat: "indian",
      currencyPosition: "before"
    });
  });

  it("fills in a language's most common region when the tag has none", () => {
    expect(getLocaleDefaults("de")).toEqual(getLocaleDefaults("de-DE"));
    expect(getLocaleDefaults("pt")).toEqual(getLocaleDefaults("pt-BR"));
    expect(getLocaleDefaults("en")).toEqual(getLocaleDefaults("en-US"));
  });

  it("lets the language decide in Canada and Belgium", () => {
    expect(getLocaleDefaults("fr-CA")).toEqual({
      numberFormat: "space-comma",
      currencyPosition: "after"
    });
    expect(getLocaleDefaults("en-CA")).toEqual({
      numberFormat: "comma-dot",
      currencyPosition: "before"
    });
    expect(getLocaleDefaults("nl-BE")).toEqual({
      numberFormat: "dot-comma",
      currencyPosition: "before"
    });
  });

  it("reads script subtags and underscores", () => {
    expect(getLocaleDefaults("zh-Hant-TW")).toEqual({
      numberFormat: "comma-dot",
      currencyPosition: "before"
    });
    expect(getLocaleDefaults("de_DE")).toEqual(getLocaleDefaults("de-DE"));
  });

  it("falls back to the stored defaults for an unknown or missing tag", () => {
    const stored = { numberFormat: "comma-dot", currencyPosition: "before" };

    expect(getLocaleDefaults(undefined)).toEqual(stored);
    expect(getLocaleDefaults("")).toEqual(stored);
    expect(getLocaleDefaults("xx")).toEqual(stored);
  });
});
