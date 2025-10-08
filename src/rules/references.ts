import type { RuleFn } from "./index.js";

type RefCfg = {
  column: string;       // key or header on current sheet
  targetSheet: string;  // sheet name
  targetColumn: string; // key or header on target sheet
  message?: string;
};

const isBlank = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "");

export const referencesRule: RuleFn = ({ sheet, rows, params, sheetRowsByName, resolveColumn, resolveOnSheet }) => {
  const cfgs = Array.isArray(params) ? (params as RefCfg[]) : [];
  const errors: any[] = [];

  for (const cfg of cfgs) {
    const srcH = resolveColumn ? resolveColumn(cfg.column) : cfg.column;
    const tgtH = resolveOnSheet ? resolveOnSheet(cfg.targetSheet, cfg.targetColumn) : cfg.targetColumn;

    const targetRows = sheetRowsByName?.[cfg.targetSheet] ?? [];
    const allowed = new Set(
      (targetRows ?? [])
        .map(r => (r as any)[tgtH])
        .filter(v => !isBlank(v))
        .map(v => String(v))
    );

    rows.forEach((r, idx) => {
      const v = (r as any)[srcH];
      if (isBlank(v)) return;
      const s = String(v);
      if (!allowed.has(s)) {
        errors.push({
          code: "RULE_REFERENCE_NOT_FOUND",
          message: cfg.message ??
            `Value "${s}" not found in ${cfg.targetSheet}.${cfg.targetColumn} (resolved "${tgtH}").`,
          sheet,
          row: idx + 2,
          column: srcH,
          value: v,
          tuple: { ...r },
        });
      }
    });
  }

  return errors;
};
