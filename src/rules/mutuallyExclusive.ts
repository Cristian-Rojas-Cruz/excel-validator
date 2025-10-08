import type { RuleFn } from "./index.js";

const isBlank = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

export const mutuallyExclusiveRule: RuleFn = ({ sheet, rows, params, resolveColumn }) => {
  const groups = Array.isArray(params) ? (params as string[][]) : [];
  const errors: any[] = []; // replace `any[]` with `ValidationError[]` if you export that type

  const toHeader = (ref: string) => (resolveColumn ? resolveColumn(ref) : ref);

  for (const group of groups) {
    const headers = group.map(toHeader);

    rows.forEach((r, idx) => {
      const filledHeaders = headers.filter((h) => !isBlank((r as any)[h]));
      if (filledHeaders.length > 1) {
        errors.push({
          code: "RULE_MUTUALLY_EXCLUSIVE",
          message: `Columns [${group.join(", ")}] (resolved: [${headers.join(
            ", "
          )}]) must be mutually exclusive. Found multiple filled: [${filledHeaders.join(", ")}].`,
          sheet,
          row: idx + 2,
          column: filledHeaders[0],
          tuple: { ...r },
        });
      }
    });
  }

  return errors;
};
