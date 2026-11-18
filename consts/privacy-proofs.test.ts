import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROOF_EXCERPTS } from "~/consts/privacy-proofs";

describe("PROOF_EXCERPTS", () => {
  for (const [name, excerpt] of Object.entries(PROOF_EXCERPTS)) {
    it(`${name} shows ${excerpt.path} as it is, at its line numbers`, () => {
      const fileLines = readFileSync(excerpt.path, "utf8").split("\n");
      const start = excerpt.firstLine - 1;

      expect(fileLines.slice(start, start + excerpt.lines.length)).toEqual(
        excerpt.lines
      );
      expect(excerpt.highlight).toBeGreaterThanOrEqual(excerpt.firstLine);
      expect(excerpt.highlight).toBeLessThan(
        excerpt.firstLine + excerpt.lines.length
      );
    });
  }
});
