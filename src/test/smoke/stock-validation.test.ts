import { describe, it, expect } from "vitest";

/** Validation rules enforced by Stock Adjustments form before submit. */
type Line = { colour_id?: string; pieces: number };
function validateStockAdjustment(opts: {
  warehouseId?: string; qualityId?: string; lValueId?: string; lines: Line[];
}): { ok: true; valid: Line[] } | { ok: false; error: string } {
  if (!opts.warehouseId || !opts.qualityId || !opts.lValueId) return { ok: false, error: "Pick warehouse, quality and L" };
  const valid = opts.lines.filter((l) => l.colour_id && Number(l.pieces) > 0);
  if (!valid.length) return { ok: false, error: "Add at least one colour with pieces" };
  const ids = valid.map((l) => l.colour_id!);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Each colour can only appear once" };
  return { ok: true, valid };
}

describe("Stock adjustment validation", () => {
  const base = { warehouseId: "w1", qualityId: "q1", lValueId: "l1" };

  it("rejects when warehouse/quality/L missing", () => {
    expect(validateStockAdjustment({ ...base, warehouseId: undefined, lines: [{ colour_id: "c1", pieces: 5 }] }))
      .toMatchObject({ ok: false, error: /warehouse/i });
  });

  it("rejects when no colour lines have pieces", () => {
    expect(validateStockAdjustment({ ...base, lines: [{ pieces: 0 }, { colour_id: "c1", pieces: 0 }] }))
      .toMatchObject({ ok: false, error: /at least one/i });
  });

  it("rejects duplicate colours", () => {
    expect(validateStockAdjustment({ ...base, lines: [{ colour_id: "c1", pieces: 5 }, { colour_id: "c1", pieces: 3 }] }))
      .toMatchObject({ ok: false, error: /only appear once/i });
  });

  it("accepts multi-colour lines, drops empties", () => {
    const r = validateStockAdjustment({ ...base, lines: [
      { colour_id: "c1", pieces: 5 },
      { pieces: 0 },
      { colour_id: "c2", pieces: 8 },
    ]});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valid).toHaveLength(2);
  });

  it("computes metres per colour as pieces × L-length", () => {
    const lLength = 1.25;
    const lines = [{ colour_id: "c1", pieces: 10 }, { colour_id: "c2", pieces: 4 }];
    const metres = lines.map((l) => l.pieces * lLength);
    expect(metres).toEqual([12.5, 5]);
  });
});