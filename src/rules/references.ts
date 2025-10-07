import type { RuleFn } from "./index.js";

type RefConfig = {
  column: string;
  targetSheet: string;
  targetColumn: string;
  message?: string;
};

export const referencesRule: RuleFn = ({ sheet, rows, params, sheetRowsByName }) => {
  const cfgs = Array.isArray(params) ? (params as RefConfig[]) : [];
  const errors: any[] = [];

  for (const cfg of cfgs) {
    const targetRows = sheetRowsByName?.[cfg.targetSheet] ?? [];
    const allowed = new Set(
      (targetRows ?? [])
        .map(r => (r as any)[cfg.targetColumn])
        .filter(v => v !== null && v !== undefined && String(v).trim() !== "")
        .map(v => String(v))
    );

    rows.forEach((r, idx) => {
      const v = (r as any)[cfg.column];
      if (v === null || v === undefined || String(v).trim() === "") return;
      const key = String(v);
      if (!allowed.has(key)) {
        errors.push({
          code: "RULE_REFERENCE_NOT_FOUND",
          message: cfg.message ?? `Value "${key}" not found in ${cfg.targetSheet}.${cfg.targetColumn}`,
          sheet,
          row: idx + 2,
          column: cfg.column,
          value: v,
          tuple: { ...r }
        });
      }
    });
  }

  return errors;
};
