import type { LibrarySelection } from "~/types";

// The next selection after a ⌘/Ctrl-click ("toggle") or a Shift-click
// ("range") on a row of the invoices panel. `order` is the rows as listed. A
// toggle moves the anchor to its row; a range runs from the anchor to the
// clicked row, from the clicked row alone when the anchor is no longer listed.
export function selectRows({
  selection,
  order,
  id,
  gesture
}: {
  selection: LibrarySelection;
  order: string[];
  id: string;
  gesture: "toggle" | "range";
}): LibrarySelection {
  if (gesture === "toggle") {
    return {
      ids: selection.ids.includes(id)
        ? selection.ids.filter(selectedId => selectedId !== id)
        : [...selection.ids, id],
      anchor: id
    };
  }

  const end = order.indexOf(id);
  const anchorIndex =
    selection.anchor === null ? -1 : order.indexOf(selection.anchor);
  const start = anchorIndex === -1 ? end : anchorIndex;

  return {
    ids: order.slice(Math.min(start, end), Math.max(start, end) + 1),
    anchor: order[start] ?? id
  };
}
