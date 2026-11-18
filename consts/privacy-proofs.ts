// The lines of code the homepage's privacy tiles show, copied from the files
// they link to on GitHub, with their real line numbers. `highlight` is the
// line that does the work. `privacy-proofs.test.ts` fails once a file moves
// on, so the excerpts can't go stale.
export const PROOF_EXCERPTS = {
  contentSecurityPolicy: {
    path: "consts/content-security-policy.ts",
    firstLine: 13,
    lines: [
      `  "img-src 'self' data: blob:",`,
      `  "font-src 'self' data:",`,
      `  "connect-src 'self' data: blob:",`,
      `  "worker-src 'self' blob:",`,
      `  "frame-src blob:",`
    ],
    highlight: 15
  },
  database: {
    path: "db/index.ts",
    firstLine: 196,
    lines: [
      "class InvoiceDatabase extends Dexie {",
      "  templates!: Table<InvoiceTemplate, string>;",
      "  invoices!: Table<InvoiceDocument, string>;",
      "  images!: Table<StoredImage, string>;",
      "  versions!: Table<InvoiceVersion, string>;"
    ],
    highlight: 196
  },
  homeTest: {
    path: "e2e/home.spec.ts",
    firstLine: 190,
    lines: [
      `    return url.protocol.startsWith("http") && url.origin !== homeOrigin;`,
      "  });",
      "",
      "  expect(requested.length).toBeGreaterThan(0);",
      "  expect(elsewhere).toEqual([]);"
    ],
    highlight: 194
  }
};
