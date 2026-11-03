import type { ReactNode } from "react";
import { DetailsSection } from "~/components/editor/shell/inspector/details-section";
import { SectionsSection } from "~/components/editor/shell/inspector/sections-section";
import { StyleSection } from "~/components/editor/shell/inspector/style-section";
import { TableSection } from "~/components/editor/shell/inspector/table-section";

// Settings that apply to the whole invoice, moved off the old Edit menu and
// out of the page so the page only holds the invoice itself.
export function InspectorPanel({ children }: { children?: ReactNode }) {
  return (
    <div
      data-inspector-scroll
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <StyleSection />
      <DetailsSection />
      <TableSection />
      <SectionsSection />
      {children}
    </div>
  );
}
