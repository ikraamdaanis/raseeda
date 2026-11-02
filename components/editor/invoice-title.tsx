import { InvoiceInput } from "~/components/editor/invoice-input";
import { useTheme, useTitleSlice } from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { getPaymentStatus } from "~/utils/payment-status";

export function InvoiceTitle() {
  const { title, setTitle } = useTitleSlice();
  const theme = useTheme();
  const showsPaidStamp = useInvoiceStore(
    state =>
      state.sections.paidStamp && getPaymentStatus(state, new Date()) === "paid"
  );

  return (
    <div data-field-area="title" className="flex items-center gap-4">
      <InvoiceInput
        id="invoice-field-title"
        aria-label="Invoice title"
        data-field="title"
        value={title}
        onChange={setTitle}
        className="w-full min-w-0 flex-1 text-5xl font-semibold"
        style={getTextStyles({ settings: getRoleSettings(theme, "title") })}
        placeholder="Invoice"
      />
      {showsPaidStamp && (
        <span
          className="shrink-0 -rotate-6 rounded-md border-2 px-2.5 py-0.5 text-lg font-bold tracking-[0.2em]"
          style={{ borderColor: theme.accent, color: theme.accent }}
        >
          PAID
        </span>
      )}
    </div>
  );
}
