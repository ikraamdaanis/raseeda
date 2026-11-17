import {
  DOCUMENT_TYPE_NAMES,
  DOCUMENT_TYPE_SHORT_NAMES
} from "~/consts/document-types";
import { cn } from "~/lib/utils";
import type { DocumentType } from "~/types";

/**
 * A document's type, as a small pill beside it in the library and the command
 * palette (issue #215). Every type looks the same, so the pill says what a row
 * is without ranking one type over another. A translucent fill keeps it
 * visible on a hovered, open or selected row alike. A proforma's pill is
 * shortened to "Proforma"; screen readers hear the full name.
 */
export function DocumentTypePill({
  documentType,
  className
}: {
  documentType: DocumentType;
  className?: string;
}) {
  const shortName = DOCUMENT_TYPE_SHORT_NAMES[documentType];
  const fullName = DOCUMENT_TYPE_NAMES[documentType];

  return (
    <span
      className={cn(
        "bg-foreground/7 text-foreground/70 dark:bg-foreground/10 inline-flex h-4 shrink-0 items-center rounded-surface px-1 text-[11px] leading-none font-medium",
        className
      )}
    >
      {shortName === fullName ? (
        fullName
      ) : (
        <>
          <span aria-hidden="true">{shortName}</span>
          <span className="sr-only">{fullName}</span>
        </>
      )}
    </span>
  );
}
