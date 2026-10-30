import { IconLoader2 } from "@tabler/icons-react";
import {
  ClientOnly,
  createFileRoute,
  useNavigate
} from "@tanstack/react-router";
import { useEffect } from "react";
import { InvoiceEditor } from "~/components/editor/invoice-editor";
import { APP_NAME } from "~/consts/app";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import {
  InvoiceDocumentProvider,
  useInvoiceDocument
} from "~/context/invoice-document-context";
import { useApplyEditorTheme } from "~/hooks/use-editor-theme";
import type { InvoiceFont } from "~/types";
import { EDITOR_THEME_SCRIPT } from "~/utils/editor-theme";
import { canonicalLink, siteMeta } from "~/utils/site-meta";
import { track } from "~/utils/track";

// Optional hand-offs from the homepage: `font` starts a fresh invoice in the
// face picked in the preview, and `open=invoices` opens the saved-invoice list.
// Anything unrecognised is dropped rather than trusted.
export const Route = createFileRoute("/create")({
  component: RouteComponent,
  head: () => ({
    meta: [
      // The editor zooms the page itself (tapping a field, pinching the
      // canvas), so iOS mustn't also zoom the whole editor into a focused
      // field. On Android the keyboard shrinks the editor rather than covering
      // its bottom, so the tab bar and the field being typed stay in view.
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, interactive-widget=resizes-content"
      },
      ...siteMeta({
        path: "/create",
        title: `${APP_NAME} editor: Create a Free Invoice PDF`,
        description:
          "Fill in your details, your client and the line items, then download the invoice as a PDF. Free, with no account, and it all stays in this browser."
      })
    ],
    links: [canonicalLink("/create")],
    scripts: [{ children: EDITOR_THEME_SCRIPT }]
  }),
  validateSearch: (
    search: Record<string, unknown>
  ): { font?: InvoiceFont; open?: "invoices" } => ({
    font: INVOICE_FONTS.find(definition => definition.id === search.font)?.id,
    open: search.open === "invoices" ? "invoices" : undefined
  })
});

// The editor is entirely client-state-driven (Zustand + IndexedDB), so it is
// rendered client-only. Server-rendering it would ship interactive inputs in the
// initial HTML that React has not attached handlers to yet; keystrokes in that
// pre-hydration window would be silently discarded when React reconciles the
// inputs back to their default values. ClientOnly renders the fallback through
// React hydration; InvoiceDocumentProvider then holds the same fallback through
// store hydration (the async draft read + blank-invoice seed), so the editor's
// inputs only mount once their bound state is settled and can't be raced.
function RouteComponent() {
  useEffect(() => {
    track("editor_opened");
  }, []);

  return (
    <section className="mx-auto flex w-full flex-col overflow-hidden">
      <ClientOnly fallback={<EditorLoading />}>
        <EditorThemeSync />
        <InvoiceDocumentProvider fallback={<EditorLoading />}>
          <StartingFont />
          <InvoiceEditor />
        </InvoiceDocumentProvider>
      </ClientOnly>
    </section>
  );
}

// The head script themes the first paint; this keeps <html> in step after that
// (toggles, other tabs, the system scheme) and clears it when leaving.
function EditorThemeSync() {
  useApplyEditorTheme();

  return null;
}

// Runs once hydration has settled (the provider only renders its children
// then), so the font lands on the blank hydration produced, not on state that
// is about to be replaced. The param is cleared afterwards so a reload or a
// later blank doesn't re-apply it.
function StartingFont() {
  const { font } = Route.useSearch();
  const navigate = useNavigate();
  const { applyStartingFont } = useInvoiceDocument();

  useEffect(() => {
    if (!font) return;

    applyStartingFont(font);
    void navigate({
      to: "/create",
      search: previous => ({ ...previous, font: undefined }),
      replace: true
    });
  }, [font, applyStartingFont, navigate]);

  return null;
}

// The server's HTML for this page is this placeholder, so it also says what
// the page is for crawlers and anyone without JavaScript. Once the editor
// mounts, its own heading (the document name) takes over.
function EditorLoading() {
  return (
    <div className="bg-desk flex h-dvh w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="sr-only">{APP_NAME} invoice editor</h1>
      <p className="sr-only">
        Create a free invoice in your browser: add your details, your client and
        the line items, then download it as a PDF. Nothing is uploaded; your
        invoices are saved in this browser.
      </p>
      <IconLoader2
        className="text-muted-foreground size-6 animate-spin"
        aria-label="Loading editor"
      />
      <noscript>
        <p className="text-muted-foreground max-w-sm text-sm text-pretty">
          The {APP_NAME} editor runs entirely in your browser, so it needs
          JavaScript. Turn JavaScript on for this site, then reload.
        </p>
      </noscript>
    </div>
  );
}
