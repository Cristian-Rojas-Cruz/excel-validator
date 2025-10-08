import type { RuleFn } from "./index.js";

type Cfg = {
  if: { column: string; equals: unknown };
  then: { column: string; allowedValues: string[] };
};

const isBlank = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "");

export const conditionalEnumRule: RuleFn = ({ sheet, rows, params, resolveColumn }) => {
  const cfgs = Array.isArray(params) ? (params as Cfg[]) : [];
  const errors: any[] = [];

  for (const cfg of cfgs) {
    const condH = resolveColumn ? resolveColumn(cfg.if.column) : cfg.if.column;
    const thenH = resolveColumn ? resolveColumn(cfg.then.column) : cfg.then.column;

    rows.forEach((r, idx) => {
      const condVal = (r as any)[condH];
      if (condVal === cfg.if.equals) {
        const thenVal = (r as any)[thenH];
        if (isBlank(thenVal)) {
          errors.push({
            code: "RULE_CONDITIONAL_ENUM",
            message: `When ${cfg.if.column} == ${String(cfg.if.equals)}, ${cfg.then.column} is required.`,
            sheet,
            row: idx + 2,
            column: thenH,
            tuple: { ...r },
          });
          return;
        }
        if (!cfg.then.allowedValues.includes(String(thenVal))) {
          errors.push({
            code: "RULE_CONDITIONAL_ENUM",
            message: `When ${cfg.if.column} == ${String(cfg.if.equals)}, ${cfg.then.column} must be one of [${cfg.then.allowedValues.join(", ")}].`,
            sheet,
            row: idx + 2,
            column: thenH,
            value: thenVal,
            tuple: { ...r },
          });
        }
      }
    });
  }

  return errors;
};
