import { IconX } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { Button } from "~/components/ui/button";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";

// Editing affordances for optional sections. Like the add / remove item
// buttons, they never appear in the rendered PDF.

/**
 * Wraps an open optional section so its remove button can reveal itself while
 * the section is hovered or focused.
 */
export function OptionalSection({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      {...props}
      className={cn("group/optional flex flex-col", className)}
    />
  );
}

/**
 * Sits beside a section's label. Hidden until the section is hovered or
 * focused on pointer devices; always visible (and finger sized) on touch.
 */
export function RemoveSectionButton({
  label,
  onClick,
  className
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  const isPreview = useIsPreview();

  if (isPreview) return null;

  return (
    <Button
      size="icon-xs"
      variant="ghost"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "text-paper-muted-foreground hover:text-paper-foreground opacity-0 group-focus-within/optional:opacity-100 group-hover/optional:opacity-100 pointer-coarse:size-11 pointer-coarse:opacity-100",
        className
      )}
    >
      <IconX aria-hidden="true" />
    </Button>
  );
}
