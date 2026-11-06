import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";

// Writes the PDF's invoice fonts into styles/pdf-fonts and their character
// coverage into consts/font-coverage.ts. react-pdf takes one file per weight
// and has no font fallback, so each weight is one file merged from every
// script subset Fontsource ships for the family (Latin, Latin Extended,
// Vietnamese, Cyrillic and Greek, where the family has them). The coverage
// table lets the editor and the PDF agree on which characters a font can
// draw, without measuring at runtime. Needs fontTools
// (`pip3 install fonttools`). Run `bun run build:pdf-fonts` after changing
// the invoice fonts or their packages.

const ROOT = join(import.meta.dir, "..");

const OUT_DIR = join(ROOT, "styles", "pdf-fonts");

const COVERAGE_FILE = join(ROOT, "consts", "font-coverage.ts");

// In this order, so where two subsets share a character the Latin one wins.
const SUBSETS = [
  "latin",
  "latin-ext",
  "vietnamese",
  "cyrillic",
  "cyrillic-ext",
  "greek",
  "greek-ext"
];

const WEIGHTS = [400, 500, 600, 700];

// Merges each job's subset files into one WOFF and prints, as JSON, the code
// points every output maps, as [first, last] ranges. Fontsource repeats some
// characters across subsets (space, "A"); merged as they are, fontTools keeps
// each copy and adds a locl swap to it, which fontkit applies, so pairs
// with "A" lose their kerning. So each subset first drops the characters an
// earlier one already has, and every character keeps its Latin glyph.
const MERGE_PROGRAM = `
import json, sys, os, tempfile
from fontTools.merge import Merger
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

jobs = json.load(sys.stdin)
coverage = {}
with tempfile.TemporaryDirectory() as work:
    for job in jobs:
        paths = []
        covered = set()
        for index, source in enumerate(job["inputs"]):
            font = TTFont(source)
            font.flavor = None
            points = set(font.getBestCmap().keys())
            fresh = points - covered
            if not fresh:
                continue
            if fresh != points:
                options = Options()
                options.layout_features = ["*"]
                options.name_IDs = ["*"]
                options.name_languages = ["*"]
                options.glyph_names = True
                options.notdef_outline = True
                options.hinting = True
                options.legacy_kern = True
                subsetter = Subsetter(options)
                subsetter.populate(unicodes=fresh)
                subsetter.subset(font)
            covered |= fresh
            path = os.path.join(work, f"{index}.ttf")
            font.save(path)
            paths.append(path)
        merged = Merger().merge(paths)
        merged.flavor = "woff"
        merged.save(job["output"])
        points = sorted(TTFont(job["output"]).getBestCmap().keys())
        ranges = []
        for point in points:
            if ranges and ranges[-1][1] == point - 1:
                ranges[-1][1] = point
            else:
                ranges.append([point, point])
        coverage[job["output"]] = ranges
json.dump(coverage, sys.stdout)
`;

function fontsourceFile(fontId: string, subset: string, weight: number) {
  return join(
    ROOT,
    "node_modules",
    "@fontsource",
    fontId,
    "files",
    `${fontId}-${subset}-${weight}-normal.woff`
  );
}

const jobs: { fontId: string; inputs: string[]; output: string }[] =
  INVOICE_FONTS.flatMap(font =>
    WEIGHTS.map(weight => ({
      fontId: font.id,
      inputs: SUBSETS.map(subset =>
        fontsourceFile(font.id, subset, weight)
      ).filter(file => existsSync(file)),
      output: join(OUT_DIR, `${font.id}-${weight}.woff`)
    }))
  );

for (const job of jobs) {
  if (job.inputs.length === 0) {
    throw new Error(`No Fontsource files for ${job.output}`);
  }
}

await mkdir(OUT_DIR, { recursive: true });

const result = spawnSync("python3", ["-c", MERGE_PROGRAM], {
  input: JSON.stringify(jobs),
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024
});

if (result.status !== 0) {
  throw new Error(`fontTools merge failed\n${result.stderr}`);
}

// MERGE_PROGRAM prints this shape: each output path's [first, last] ranges.
const coverageByFile: Record<string, [number, number][]> = JSON.parse(
  result.stdout
);

// A font covers a character only when every one of its weights does, so a
// heading in bold never draws a box the body text didn't.
function intersect(
  first: [number, number][],
  second: [number, number][]
): [number, number][] {
  const ranges: [number, number][] = [];
  let firstIndex = 0;
  let secondIndex = 0;

  while (firstIndex < first.length && secondIndex < second.length) {
    const start = Math.max(first[firstIndex][0], second[secondIndex][0]);
    const end = Math.min(first[firstIndex][1], second[secondIndex][1]);

    if (start <= end) ranges.push([start, end]);

    if (first[firstIndex][1] < second[secondIndex][1]) firstIndex++;
    else secondIndex++;
  }

  return ranges;
}

const lines = INVOICE_FONTS.map(font => {
  const fontJobs = jobs.filter(job => job.fontId === font.id);
  const ranges = fontJobs
    .map(job => coverageByFile[job.output])
    .reduce((covered, next) => intersect(covered, next));
  const encoded = ranges
    .map(([start, end]) =>
      start === end
        ? start.toString(16)
        : `${start.toString(16)}-${end.toString(16)}`
    )
    .join(",");

  return `  "${font.id}": "${encoded}"`;
});

await writeFile(
  COVERAGE_FILE,
  `import type { InvoiceFont } from "~/types";

// Generated by scripts/build-pdf-fonts.ts from the PDF's font files; don't
// edit by hand. Each font's code points, in hex, as comma-separated single
// points and first-last ranges.
export const FONT_COVERAGE: Record<InvoiceFont, string> = {
${lines.join(",\n")}
};
`
);

spawnSync("bunx", ["prettier", "--write", COVERAGE_FILE], { stdio: "inherit" });
