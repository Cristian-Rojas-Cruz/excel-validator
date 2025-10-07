import type { RuleFn } from "./index.js";

export const atLeastOneRequiredRule: RuleFn = ({ sheet, rows, params }) => {
  const groups = Array.isArray(params) ? (params as string[][]) : [];
  const errors: any[] = [];

  const isBlank = (v: unknown) =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "");

  rows.forEach((r, idx) => {
    for (const group of groups) {
      const hasAny = group.some(c => !isBlank((r as any)[c]));
      if (!hasAny) {
        errors.push({
          code: "RULE_AT_LEAST_ONE_REQUIRED",
          message: `At least one of [${group.join(", ")}] is required.`,
          sheet,
          row: idx + 2,
          tuple: { ...r }
        });
      }
    }
  });

  return errors;
};
