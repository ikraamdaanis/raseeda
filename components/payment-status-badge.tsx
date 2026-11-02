import { cn } from "~/lib/utils";
import type { Invoice } from "~/types";
import {
  getPaymentStatus,
  PAYMENT_STATUS_LABELS
} from "~/utils/payment-status";

const STATUS_CLASSES = {
  paid: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  partPaid: "bg-muted text-foreground",
  overdue: "bg-red-500/12 text-red-700 dark:text-red-300"
} as const;

// An invoice's payment status in a list row: Paid, Part paid or Overdue. An
// invoice that's simply not due yet shows nothing, so the lists stay quiet.
export function PaymentStatusBadge({
  invoice,
  className
}: {
  invoice: Invoice;
  className?: string;
}) {
  const status = getPaymentStatus(invoice, new Date());

  if (status === "unpaid") return null;

  return (
    <span
      className={cn(
        "shrink-0 rounded-sm px-1 text-[11px]/4 font-medium",
        STATUS_CLASSES[status],
        className
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
