import { describe, expect, it } from "vitest";
import { isUpdateCheckDue } from "~/utils/new-version-prompt";

const HOUR = 60 * 60 * 1000;

describe("isUpdateCheckDue", () => {
  it("waits an hour after the last check", () => {
    expect(isUpdateCheckDue(0, HOUR - 1)).toBe(false);
  });

  it("checks again once an hour has passed", () => {
    expect(isUpdateCheckDue(0, HOUR)).toBe(true);
    expect(isUpdateCheckDue(0, 3 * HOUR)).toBe(true);
  });
});
