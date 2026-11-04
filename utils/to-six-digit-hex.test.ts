import { describe, expect, it } from "vitest";
import { toSixDigitHex } from "~/utils/to-six-digit-hex";

describe("toSixDigitHex", () => {
  it("keeps a six-digit code", () => {
    expect(toSixDigitHex("#f9fafb")).toBe("#f9fafb");
  });

  it("spells out a three-digit code, with or without its #", () => {
    expect(toSixDigitHex("#abc")).toBe("#aabbcc");
    expect(toSixDigitHex("ABC")).toBe("#aabbcc");
  });

  it("reads black where there's no browser to read a colour name", () => {
    expect(toSixDigitHex("white")).toBe("#000000");
  });
});
