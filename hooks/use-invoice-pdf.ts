import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import { useDocumentName } from "~/context/invoice-document-context";
import { useInvoiceData } from "~/stores/invoice-selectors";
import { buildPdf, prefetchPdfBuilder } from "~/utils/build-pdf";
import { saveFile, toPdfFileName } from "~/utils/save-file";
import { track } from "~/utils/track";

function reportFailure(error: unknown) {
  toast.error(
    error instanceof Error
      ? `Failed to generate PDF: ${error.message}`
      : "Failed to generate PDF"
  );
}

// Builds the open invoice's PDF and saves it (downloadPdf) or opens it in a
// new tab (openPdf). `prefetch` warms the PDF engine early (call it on hover
// or focus of whatever leads to a download).
export function useInvoicePdf() {
  const invoice = useInvoiceData();
  const documentName = useDocumentName();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof requestIdleCallback === "undefined") {
      const timeout = setTimeout(prefetchPdfBuilder, 2000);

      return () => clearTimeout(timeout);
    }

    const idleCallback = requestIdleCallback(prefetchPdfBuilder, {
      timeout: 5000
    });

    return () => cancelIdleCallback(idleCallback);
  }, []);

  function downloadPdf() {
    startTransition(async () => {
      try {
        saveFile(await buildPdf(invoice), toPdfFileName(documentName));
        track("pdf_downloaded");
      } catch (error) {
        reportFailure(error);
      }
    });
  }

  function openPdf() {
    // Open window immediately while we still have user interaction context
    const newWindow = window.open("", "_blank");

    if (!newWindow) {
      return toast.error("Failed to open new window. Popup may be blocked.");
    }

    startTransition(async () => {
      try {
        const url = URL.createObjectURL(await buildPdf(invoice));

        newWindow.location.href = url;

        if (!newWindow.closed) track("pdf_opened");

        // Don't revoke the URL - Chrome's PDF viewer needs it to persist
        // The browser will automatically clean it up when the tab is closed
      } catch (error) {
        reportFailure(error);
        newWindow.close();
      }
    });
  }

  return { pending, downloadPdf, openPdf, prefetch: prefetchPdfBuilder };
}
