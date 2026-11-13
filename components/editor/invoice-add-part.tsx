import { IconPlus } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import { useDocumentType, useSectionsSlice } from "~/stores/invoice-selectors";
import { getAddableParts } from "~/utils/page-parts";

const slotClassName =
  "text-paper-muted-foreground/70 hover:text-paper-foreground aria-expanded:text-paper-foreground focus-visible:ring-ring flex h-6 w-fit items-center gap-1 rounded px-1 text-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-1 pointer-coarse:h-11";

// An area's switched-off parts, turned on from where they print: the area's
// parts that are off as one entry each, for adding to its slot.
export function useAddableParts(
  area: Parameters<typeof getAddableParts>[0]["area"]
) {
  const { sections, setSection } = useSectionsSlice();
  const documentType = useDocumentType();

  return getAddableParts({ area, sections, documentType }).map(part => ({
    id: part.key,
    label: part.label,
    onAdd: () => setSection(part.key, true)
  }));
}

/**
 * The faint slot where an area's switched-off parts would print, in Edit mode
 * only. One part is named ("+ Logo"); more open a short menu of them ("+
 * Add"). Picking one turns it on in its place; its own × hides it again.
 */
export function AddPartSlot({
  areaName,
  parts,
  align = "start",
  className
}: {
  areaName: string;
  parts: { id: string; label: string; onAdd: () => void }[];
  align?: "start" | "end";
  className?: string;
}) {
  const isPreview = useIsPreview();
  const onlyPart = parts.length === 1 ? parts.at(0) : undefined;

  if (isPreview || parts.length === 0) return null;

  if (onlyPart) {
    return (
      <button
        type="button"
        aria-label={`Add ${onlyPart.label.toLowerCase()}`}
        onClick={onlyPart.onAdd}
        className={cn(slotClassName, className)}
      >
        <IconPlus aria-hidden="true" className="size-3.5 shrink-0" />
        {onlyPart.label}
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Add to the ${areaName}`}
        className={cn(slotClassName, className)}
      >
        <IconPlus aria-hidden="true" className="size-3.5 shrink-0" />
        Add
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-auto min-w-40">
        {parts.map(part => (
          <DropdownMenuItem key={part.id} onClick={part.onAdd}>
            {part.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
