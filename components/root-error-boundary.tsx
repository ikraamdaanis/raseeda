import { IconAlertTriangle, IconRotate } from "@tabler/icons-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

export function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "An unexpected error occurred.";

  function handleReload() {
    window.location.reload();
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh items-center justify-center px-6 antialiased">
      <div className="rounded-surface border-border bg-card flex w-full max-w-md flex-col items-center gap-6 border p-10 text-center shadow-xl shadow-black/5">
        <div className="border-brand-200 bg-brand-50 text-brand-600 rounded-surface flex size-12 items-center justify-center border">
          <IconAlertTriangle className="size-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm text-pretty">
            The page ran into an unexpected problem. Your saved invoices and
            templates are stored on your device and are safe.
          </p>
        </div>
        <pre className="rounded-surface border-border bg-muted text-muted-foreground max-h-32 w-full overflow-auto border p-3 text-left font-mono text-xs">
          {message}
        </pre>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="h-9 px-4 text-sm">
            <IconRotate className="size-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={handleReload}
            className="h-9 px-4 text-sm"
          >
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
