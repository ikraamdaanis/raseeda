import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOME_PREVIEW_FONT_TEXT } from "~/consts/home-preview-fonts";

// Writes the homepage's tiny invoice-font previews into styles/preview-fonts.
// The homepage shows each invoice font only as a word or two ("Invoice" in
// the font demo, "Aa" in the hero's inspector), so rather than download every
// full font (400 KB together) it gets each one cut down to those letters at
// its regular weight, a few KB apiece. Geist and Geist Mono aren't here: the
// homepage loads them in full anyway. Needs fontTools with brotli
// (`pip3 install fonttools brotli`). Run `bun run subset:preview-fonts` after
// changing the fonts or the preview text.

const ROOT = join(import.meta.dir, "..");

const OUT_DIR = join(ROOT, "styles", "preview-fonts");

// Each preview's source: the latin file the app itself serves, and whether
// it is variable (and so pinned to its regular weight first).
const SOURCES = [
  {
    id: "inter",
    file: "@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2",
    isVariable: true
  },
  {
    id: "dm-sans",
    file: "@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
    isVariable: true
  },
  {
    id: "ibm-plex-sans",
    file: "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
    isVariable: true
  },
  {
    id: "bricolage-grotesque",
    file: "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
    isVariable: true
  },
  {
    id: "lora",
    file: "@fontsource-variable/lora/files/lora-latin-wght-normal.woff2",
    isVariable: true
  },
  {
    id: "libre-baskerville",
    file: "@fontsource-variable/libre-baskerville/files/libre-baskerville-latin-wght-normal.woff2",
    isVariable: true
  },
  {
    id: "jetbrains-mono",
    file: "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
    isVariable: true
  },
  {
    id: "ibm-plex-mono",
    file: "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
    isVariable: false
  }
];

function run(args: string[]) {
  const result = spawnSync("python3", ["-m", ...args], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(`python3 -m ${args.join(" ")}\n${result.stderr}`);
  }
}

await mkdir(OUT_DIR, { recursive: true });

const workDir = await mkdtemp(join(tmpdir(), "preview-fonts-"));

try {
  for (const source of SOURCES) {
    const input = join(ROOT, "node_modules", source.file);
    const regular = join(workDir, `${source.id}.ttf`);

    if (source.isVariable) {
      run(["fontTools.varLib.instancer", input, "wght=400", "-o", regular]);
    }

    run([
      "fontTools.subset",
      source.isVariable ? regular : input,
      `--text=${HOME_PREVIEW_FONT_TEXT}`,
      "--layout-features=kern,liga",
      "--no-hinting",
      "--desubroutinize",
      "--flavor=woff2",
      `--output-file=${join(OUT_DIR, `${source.id}.woff2`)}`
    ]);
  }
} finally {
  await rm(workDir, { recursive: true, force: true });
}
