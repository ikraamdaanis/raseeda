import { describe, expect, it } from "vitest";
import type { TextSettings } from "~/types";
import { getTextStyles } from "~/utils/get-text-styles";

const settings: TextSettings = {
  align: "center",
  size: "16",
  weight: "Bold",
  color: "#ff0000"
};

describe("getTextStyles", () => {
  it("maps settings onto CSS style keys", () => {
    const styles = getTextStyles({ settings });

    expect(styles.color).toBe("#ff0000");
    expect(styles.fontSize).toBe("16px");
    expect(styles.fontWeight).toBe(700);
    expect(styles.textAlign).toBe("center");
  });

  it("removes color when requested", () => {
    const styles = getTextStyles({ settings, remove: ["color"] });

    expect(styles).not.toHaveProperty("color");
    expect(styles.fontSize).toBe("16px");
    expect(styles.fontWeight).toBe(700);
    expect(styles.textAlign).toBe("center");
  });

  it("removes fontSize when size is requested", () => {
    const styles = getTextStyles({ settings, remove: ["size"] });

    expect(styles).not.toHaveProperty("fontSize");
    expect(styles.color).toBe("#ff0000");
    expect(styles.fontWeight).toBe(700);
    expect(styles.textAlign).toBe("center");
  });

  it("removes fontWeight when weight is requested", () => {
    const styles = getTextStyles({ settings, remove: ["weight"] });

    expect(styles).not.toHaveProperty("fontWeight");
    expect(styles.color).toBe("#ff0000");
    expect(styles.fontSize).toBe("16px");
    expect(styles.textAlign).toBe("center");
  });

  it("removes textAlign when align is requested", () => {
    const styles = getTextStyles({ settings, remove: ["align"] });

    expect(styles).not.toHaveProperty("textAlign");
    expect(styles.color).toBe("#ff0000");
    expect(styles.fontSize).toBe("16px");
    expect(styles.fontWeight).toBe(700);
  });

  it("removes every requested key at once", () => {
    const styles = getTextStyles({
      settings,
      remove: ["color", "size", "weight", "align"]
    });

    expect(styles).not.toHaveProperty("color");
    expect(styles).not.toHaveProperty("fontSize");
    expect(styles).not.toHaveProperty("fontWeight");
    expect(styles).not.toHaveProperty("textAlign");
  });
});
