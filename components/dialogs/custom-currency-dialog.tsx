import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

/**
 * Lets the user type a free-form currency symbol (up to 4 characters) for the
 * current invoice when none of the preset symbols fit.
 */
export function CustomCurrencyDialog({
  open,
  onOpenChange,
  currentSymbol,
  currentCode,
  title = "Custom currency",
  isTaken,
  onSubmit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSymbol: string;
  currentCode: string;
  title?: string;
  isTaken?: (symbol: string, code: string) => boolean;
  onSubmit: (symbol: string, code: string) => void;
}) {
  const [value, setValue] = useState(currentSymbol);
  const [code, setCode] = useState(currentCode);

  useEffect(() => {
    if (open) {
      setValue(currentSymbol);
      setCode(currentCode);
    }
  }, [open, currentSymbol, currentCode]);

  const trimmed = value.trim();
  const taken = isTaken?.(trimmed, code.trim().toUpperCase()) ?? false;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!trimmed || taken) return;

    onSubmit(trimmed, code.trim().toUpperCase());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Enter a symbol (up to 4 characters) and an optional ISO code to show
            on this invoice.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 px-4 py-2">
            <Input
              name="currency-symbol"
              aria-label="Currency symbol"
              value={value}
              onChange={event =>
                setValue(event.target.value.replace(/\p{N}/gu, "").slice(0, 4))
              }
              maxLength={4}
              autoFocus
              autoComplete="off"
              placeholder="Symbol, e.g. ₿"
              className="max-sm:text-base"
            />
            <Input
              name="currency-code"
              aria-label="Currency ISO code"
              value={code}
              onChange={event =>
                setCode(
                  event.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 3)
                )
              }
              maxLength={3}
              autoComplete="off"
              placeholder="ISO code, e.g. BTC (optional)"
              className="uppercase max-sm:text-base"
            />
            {taken && (
              <p className="text-destructive text-xs">
                That’s already the invoice’s currency.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed || taken}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
