import { IconFileUnknown } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

export function NotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-svh items-center justify-center px-6 antialiased">
      <div className="rounded-surface border-border bg-card flex w-full max-w-md flex-col items-center gap-6 border p-10 text-center shadow-xl shadow-black/5">
        <div className="border-brand-200 bg-brand-50 text-brand-600 rounded-surface flex size-12 items-center justify-center border">
          <IconFileUnknown className="size-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-muted-foreground text-sm text-pretty">
            We couldn&apos;t find the page you were looking for. It may have
            moved, or the link might be wrong.
          </p>
        </div>
        <Link to="/">
          <Button className="h-9 px-4 text-sm">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
