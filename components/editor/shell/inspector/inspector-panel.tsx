import type { ReactNode } from "react";
import { FormatSection } from "~/components/editor/shell/inspector/format-section";
import { StyleSection } from "~/components/editor/shell/inspector/style-section";
import { TableSection } from "~/components/editor/shell/inspector/table-section";

// How the invoice looks and reads. Whatever prints, values and the parts that
// are on, is changed on the page instead.
export function InspectorPanel({ children }: { children?: ReactNode }) {
  return (
    <div
      data-inspector-scroll
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <StyleSection />
      <FormatSection />
      <TableSection />
      {children}
    </div>
  );
}
