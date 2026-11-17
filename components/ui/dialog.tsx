"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IconX } from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

export function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

export function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/50 duration-200 ease-(--ease-out-strong) data-closed:duration-150",
        className
      )}
      {...props}
    />
  );
}

// 500px wide, or the screen less a 1rem margin each side when that is
// narrower. A wider dialog sets its own `w-*`, never a `max-w-*`, so the
// margin still caps it.
export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "bg-popover text-popover-foreground ring-foreground/10 shadow-menu data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 flex w-125 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-md text-sm ring-1 duration-200 ease-(--ease-out-strong) outline-none data-closed:duration-150 dark:shadow-none",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-1/2 pointer-fine:after:hidden"
                size="icon-sm"
              />
            }
          >
            <IconX />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

// The title and description, led by an icon at the top left when the dialog
// has one, on a phone as on a desktop.
export function DialogHeader({
  className,
  icon,
  children,
  ...props
}: ComponentProps<"div"> & { icon?: ReactNode }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex items-start gap-3 p-4 pb-2", className)}
      {...props}
    >
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </div>
  );
}

// A light wash with a dark icon of the same hue. Colour means something here:
// red for danger, amber for a warning, green for success, and grey for a
// dialog whose icon only names what it holds.
const DIALOG_ICON_TONES = {
  destructive: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  warning:
    "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  success:
    "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  neutral: "bg-muted text-muted-foreground"
} as const;

// The tinted circle beside a dialog's heading.
export function DialogIcon({
  tone,
  className,
  ...props
}: ComponentProps<"div"> & { tone: keyof typeof DIALOG_ICON_TONES }) {
  return (
    <div
      aria-hidden="true"
      data-slot="dialog-icon"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
        DIALOG_ICON_TONES[tone],
        className
      )}
      {...props}
    />
  );
}

// On a phone, alerts and short forms stack their actions full width, the main
// one on top (it comes last in the markup, after Cancel); from `sm` they sit
// in a row on the right, the main one last. Dialogs that browse a list keep a
// bar along the bottom with a status on the left.
export function DialogFooter({
  className,
  layout = "stack",
  showCloseButton = false,
  children,
  ...props
}: ComponentProps<"div"> & {
  layout?: "stack" | "bar";
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        layout === "stack"
          ? "flex flex-col-reverse gap-2 p-4 pt-2 *:h-11 *:w-full *:text-base sm:flex-row sm:justify-end sm:*:h-8 sm:*:w-auto sm:*:text-sm"
          : "flex flex-col-reverse gap-2 rounded-b-md border-t px-4 py-2.5 max-sm:*:h-11 max-sm:*:text-base sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

export function DialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base/5 font-semibold text-balance",
        className
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-muted-foreground *:[a]:hover:text-foreground text-base/5 text-pretty sm:text-sm/4.5 *:[a]:underline *:[a]:underline-offset-3",
        className
      )}
      {...props}
    />
  );
}
