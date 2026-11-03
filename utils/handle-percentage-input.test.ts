import { describe, expect, it } from "vitest";
import { handlePercentageInput } from "~/utils/handle-percentage-input";

// What a field shows after each key, as typing goes through the handler.
function typeKeys(keys: string[]) {
  return keys.reduce((shown, key) => handlePercentageInput(shown + key), "");
}

describe("handlePercentageInput", () => {
  it("reads a leading dot as the start of a fraction", () => {
    expect(typeKeys([".", "5"])).toBe("0.5");
  });

  it("keeps a whole number and up to two decimals", () => {
    expect(typeKeys(["1", "2", ".", "5", "7", "9"])).toBe("12.57");
  });

  it("stays empty when cleared", () => {
    expect(handlePercentageInput("")).toBe("");
  });
});
