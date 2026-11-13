import { bucketUserAgent } from "~/utils/user-agent";

// Desktop Chrome, Edge and Firefox print a PDF from a hidden frame on the
// page. Safari won't, and phone browsers have no print for a framed PDF, so
// there Print opens the PDF in a new tab for the browser's own viewer (Chrome
// on Android downloads it and the system viewer prints it).
export function printsInFrame(userAgent: string) {
  const { browser, os, device } = bucketUserAgent(userAgent);

  if (device !== "desktop" || os === "ios" || os === "android") return false;

  return browser === "chrome" || browser === "edge" || browser === "firefox";
}

// The frame stays until the next print: the print dialog can still be reading
// it after print() returns.
let printFrame: HTMLIFrameElement | undefined;

function removePrintFrame() {
  if (!printFrame) return;

  URL.revokeObjectURL(printFrame.src);
  printFrame.remove();
  printFrame = undefined;
}

// Opens the print dialog with the PDF itself, so what prints is the file the
// download gives, at its own paper size, and never the editor.
export function printPdfInFrame(pdf: Blob) {
  removePrintFrame();

  const frame = document.createElement("iframe");

  frame.title = "PDF to print";
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("data-print-frame", "");
  frame.style.cssText =
    "position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden";
  frame.addEventListener(
    "load",
    () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    },
    { once: true }
  );
  frame.src = URL.createObjectURL(pdf);
  document.body.append(frame);
  printFrame = frame;
}
