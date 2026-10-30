// The only events /api/event records (app/analytics-event.ts). Anything else
// is dropped, so the dataset can't be filled with made-up names. No event
// carries anything typed into an invoice.
export const ANALYTICS_EVENTS = [
  "page_view",
  "editor_opened",
  "pdf_opened",
  "invoice_saved",
  "template_saved",
  "data_exported",
  "data_imported"
] as const;

// The route patterns a page_view may name. Any other path is dropped.
export const PAGE_VIEW_PATHS = [
  "/",
  "/create",
  "/invoice-template",
  "/privacy"
] as const;
