import { describe, expect, it } from "vitest";
import { selectRows } from "~/utils/library-selection";

const ORDER = ["alpha", "bravo", "charlie", "delta"];

describe("selectRows", () => {
  it("toggles a row into and out of the selection", () => {
    const added = selectRows({
      selection: { ids: ["alpha"], anchor: "alpha" },
      order: ORDER,
      id: "charlie",
      gesture: "toggle"
    });

    expect(added).toEqual({ ids: ["alpha", "charlie"], anchor: "charlie" });
    expect(
      selectRows({
        selection: added,
        order: ORDER,
        id: "alpha",
        gesture: "toggle"
      })
    ).toEqual({ ids: ["charlie"], anchor: "alpha" });
  });

  it("selects the rows from the anchor to the clicked row, in either direction", () => {
    expect(
      selectRows({
        selection: { ids: ["bravo"], anchor: "bravo" },
        order: ORDER,
        id: "delta",
        gesture: "range"
      })
    ).toEqual({ ids: ["bravo", "charlie", "delta"], anchor: "bravo" });
    expect(
      selectRows({
        selection: { ids: ["charlie"], anchor: "charlie" },
        order: ORDER,
        id: "alpha",
        gesture: "range"
      })
    ).toEqual({ ids: ["alpha", "bravo", "charlie"], anchor: "charlie" });
  });

  it("starts a range at the clicked row when the anchor is gone", () => {
    expect(
      selectRows({
        selection: { ids: [], anchor: "deleted" },
        order: ORDER,
        id: "bravo",
        gesture: "range"
      })
    ).toEqual({ ids: ["bravo"], anchor: "bravo" });
  });

  it("starts a range at the clicked row with no anchor", () => {
    expect(
      selectRows({
        selection: { ids: [], anchor: null },
        order: ORDER,
        id: "charlie",
        gesture: "range"
      })
    ).toEqual({ ids: ["charlie"], anchor: "charlie" });
  });
});
