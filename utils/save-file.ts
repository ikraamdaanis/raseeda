// Characters Windows, macOS or Linux won't take in a file name, and control
// characters.
// eslint-disable-next-line no-control-regex
const UNSAFE_FILE_NAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;

// A name made safe to save as: unsafe characters become dashes, runs of
// spaces collapse and trailing dots go (Windows drops them). An empty name
// falls back to `fallback`.
export function toFileName(name: string, fallback: string): string {
  const safe = name
    .replace(UNSAFE_FILE_NAME_CHARACTERS, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.\s]+$/, "");

  return safe || fallback;
}

// The last download's blob URL. iOS Safari opens a downloaded PDF in its
// viewer and reads the blob again when it's shared or saved from there, however
// long after, so the URL is kept until the next download lets it go.
let lastDownloadUrl: string | null = null;

// Saves a blob as a download under `fileName`.
export function saveFile(blob: Blob, fileName: string) {
  if (lastDownloadUrl) URL.revokeObjectURL(lastDownloadUrl);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  lastDownloadUrl = url;
  link.href = url;
  link.download = fileName;
  link.click();
}

// The file an invoice's PDF saves as: its name, made safe.
export function toPdfFileName(invoiceName: string): string {
  return `${toFileName(invoiceName, "invoice")}.pdf`;
}
