import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { EditorElsewhereNotice } from "~/components/editor/shell/editor-elsewhere-notice";
import { exposeAutomationApi } from "~/context/automation-api";
import {
  attachEditor,
  detachEditor,
  documentActions,
  hydrateDocument,
  isDocumentHydrated
} from "~/context/editor-session";
import { useDocumentStore } from "~/stores/document-store";
import { useInvoiceStore } from "~/stores/invoice-store";
import { deriveInvoiceName } from "~/utils/invoice-name";

// Marker context: identity lives in the document store, so the provider
// carries no value. Its job is to scope the editor session (hydrate, then
// attach the editor to the open invoice while it's mounted) and to let the
// hook assert it is used inside the editor.
const InvoiceDocumentContext = createContext<boolean>(false);

export function InvoiceDocumentProvider({
  children,
  fallback = null
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  // Gate the editor on hydration. Its inputs are bound to the invoice store,
  // which hydration replaces with the invoice this tab had open; mounting them
  // first would let a keystroke land on state that's about to be replaced.
  const [isHydrated, setIsHydrated] = useState(isDocumentHydrated);
  const isElsewhere = useDocumentStore(state => state.status === "elsewhere");

  useEffect(() => {
    let cancelled = false;

    void hydrateDocument().finally(() => {
      if (!cancelled) setIsHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // While the editor is on screen this tab has it, or waits in line for it.
  // Leaving the editor writes what's pending and lets another tab have it.
  // Scripts and assistants can drive the editor through window.raseeda while
  // it's open (context/automation-api.ts).
  useEffect(() => {
    if (!isHydrated) return;

    return exposeAutomationApi();
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;

    void attachEditor();

    return () => {
      void detachEditor();
    };
  }, [isHydrated]);

  if (!isHydrated) return fallback;
  if (isElsewhere) return <EditorElsewhereNotice />;

  return (
    <InvoiceDocumentContext.Provider value={true}>
      {children}
    </InvoiceDocumentContext.Provider>
  );
}

export function useInvoiceDocument() {
  const withinProvider = useContext(InvoiceDocumentContext);

  if (!withinProvider) {
    throw new Error(
      "useInvoiceDocument must be used within an InvoiceDocumentProvider"
    );
  }

  const {
    documentId,
    isRecord,
    status,
    saveFailure,
    backupReminder,
    copyReview
  } = useDocumentStore(
    useShallow(state => ({
      documentId: state.documentId,
      isRecord: state.isRecord,
      status: state.status,
      saveFailure: state.saveFailure,
      backupReminder: state.backupReminder,
      copyReview: state.copyReview
    }))
  );

  return {
    currentDocumentId: documentId,
    // The open invoice's id once it's in the library, for highlighting it in
    // lists; null while it's a new invoice nobody has edited.
    libraryDocumentId: isRecord ? documentId : null,
    isRecord,
    status,
    saveFailure,
    backupReminder,
    // Shown only while the copy it was made for is open.
    copyReview:
      copyReview && copyReview.documentId === documentId
        ? copyReview.message
        : null,
    ...documentActions
  };
}

// The open invoice's name: the one it was given, or until then, its number
// and client.
export function useDocumentName(): string {
  const { documentName, nameSource } = useDocumentStore(
    useShallow(state => ({
      documentName: state.documentName,
      nameSource: state.nameSource
    }))
  );
  const autoName = useInvoiceStore(state =>
    deriveInvoiceName({ number: state.number, client: state.client })
  );

  return nameSource === "user" && documentName ? documentName : autoName;
}

export { DocumentNotFoundError } from "~/context/editor-session";
