import type { RuleFn } from "./index.js";

type CondEnumCfg = {
  if: { column: string; equals: unknown };
  then: { column: string; allowedValues: string[] };
};

export const conditionalEnumRule: RuleFn = ({ sheet, rows, params }) => {
  const cfgs = Array.isArray(params) ? (params as CondEnumCfg[]) : [];
  const errors: any[] = [];

  rows.forEach((r, idx) => {
    for (const cfg of cfgs) {
      const condVal = (r as any)[cfg.if.column];
      if (condVal === cfg.if.equals) {
        const thenVal = (r as any)[cfg.then.column];
        if (thenVal !== null && thenVal !== undefined && String(thenVal).trim() !== "") {
          if (!cfg.then.allowedValues.includes(String(thenVal))) {
            errors.push({
              code: "RULE_CONDITIONAL_ENUM",
              message: `When ${cfg.if.column} == ${String(cfg.if.equals)}, ${cfg.then.column} must be one of [${cfg.then.allowedValues.join(", ")}].`,
              sheet,
              row: idx + 2,
              column: cfg.then.column,
              value: thenVal,
              tuple: { ...r }
            });
          }
        } else {
          errors.push({
            code: "RULE_CONDITIONAL_ENUM",
            message: `When ${cfg.if.column} == ${String(cfg.if.equals)}, ${cfg.then.column} is required.`,
            sheet,
            row: idx + 2,
            column: cfg.then.column,
            tuple: { ...r }
          });
        }
      }
    }
  });

  return errors;
};
