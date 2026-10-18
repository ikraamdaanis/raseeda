import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { InvoiceNameSource } from "~/types";

// The open invoice's identity and save state, mirrored from the document
// session (context/document-session.ts) for the editor to render. It lives in
// its own store, apart from the invoice content: `setInvoice` replaces the
// whole content store, and identity must survive that.
type DocumentState = {
  // Set for every invoice, including a new one that isn't in the library yet.
  documentId: string | null;
  // Whether the invoice is in the library. A new invoice joins it on its
  // first edit.
  isRecord: boolean;
  // The name someone gave it; an automatic name is worked out from the
  // content as it's shown (see useDocumentName).
  documentName: string;
  nameSource: InvoiceNameSource;
  // Where the open invoice stands, for the editor to show:
  // - editing: this tab edits it and every change saves itself
  // - readOnly: another tab is editing it; this one follows along
  // - deleted: it was deleted elsewhere, so nothing more is written to it
  // - reloadRequired: a newer version of the app upgraded storage in another tab
  // - unavailable: this browser won't give the app any storage
  status: "editing" | "readOnly" | "deleted" | "reloadRequired" | "unavailable";
  // The current save failure, if a save failed. `episode` changes only when a
  // new run of failures starts, not on every retry, so it's announced once.
  saveFailure: {
    message: string;
    storageFull: boolean;
    episode: number;
  } | null;
  // Suggest a backup: this is Safari, which clears a site's storage after a
  // week unused, it refused to keep the app's storage, and nobody has
  // dismissed the suggestion yet.
  backupReminder: boolean;
};

const documentDefault: DocumentState = {
  documentId: null,
  isRecord: false,
  documentName: "",
  nameSource: "auto",
  status: "editing",
  saveFailure: null,
  backupReminder: false
};

export const useDocumentStore = create<DocumentState>()(
  subscribeWithSelector(() => ({ ...documentDefault }))
);
