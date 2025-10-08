import type { RuleFn } from "./index.js";

const isBlank = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "");

export const atLeastOneRequiredRule: RuleFn = ({ sheet, rows, params, resolveColumn }) => {

  const groups = Array.isArray(params) ? (params as string[][]) : [];
  const errors: any[] = [];

  for (const group of groups) {
    const headers = group.map(ref => resolveColumn ? resolveColumn(ref) : ref);

    rows.forEach((r, idx) => {
      const hasAny = headers.some(h => !isBlank((r as any)[h]));
      if (!hasAny) {
        errors.push({
          code: "RULE_AT_LEAST_ONE_REQUIRED",
          message: `At least one of [${group.join(", ")}] is required (resolved: [${headers.join(", ")}]).`,
          sheet,
          row: idx + 2,
          tuple: { ...r },
        });
      }
    });
  }

  return errors;
};
