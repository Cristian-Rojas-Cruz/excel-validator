import type { RuleFn } from "./index.js";

type Params = {
  when: { column: string; equals: unknown };
  thenRequired: string[]; // keys or headers
};

const isBlank = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "");

export const conditionalRequiredRule: RuleFn = ({ sheet, rows, params, resolveColumn }) => {
  const p = params as Params;
  const whenH = resolveColumn ? resolveColumn(p.when.column) : p.when.column;
  const thenHs = (p.thenRequired ?? []).map(ref => resolveColumn ? resolveColumn(ref) : ref);

  const errors: any[] = [];

  rows.forEach((r, idx) => {
    const cond = (r as any)[whenH];
    if (cond === p.when.equals) {
      for (const h of thenHs) {
        if (isBlank((r as any)[h])) {
          errors.push({
            code: "RULE_CONDITIONAL_REQUIRED",
            message: `When ${p.when.column} == ${String(p.when.equals)}, column "${h}" is required.`,
            sheet,
            row: idx + 2,
            column: h,
            tuple: { ...r },
          });
        }
      }
    }
  });

  return errors;
};
