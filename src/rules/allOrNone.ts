import type { RuleFn } from "./index.js";

export const allOrNoneRule: RuleFn = ({ sheet, rows, params }) => {
  const groups = Array.isArray(params) ? (params as string[][]) : [];
  const errors: any[] = [];

  const isBlank = (v: unknown) =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "");

  rows.forEach((r, idx) => {
    for (const group of groups) {
      const filled = group.filter(c => !isBlank((r as any)[c]));
      if (filled.length > 0 && filled.length < group.length) {
        const missing = group.filter(c => isBlank((r as any)[c]));
        errors.push({
          code: "RULE_ALL_OR_NONE",
          message: `All-or-none violation for [${group.join(", ")}]; missing: ${missing.join(", ")}.`,
          sheet,
          row: idx + 2,
          tuple: { ...r }
        });
      }
    }
  });

  return errors;
};
