import type { RuleFn } from "./index.js";

type Params = { columns: string[] }; // keys or headers

const isBlank = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "");

export const uniqueRule: RuleFn = ({ sheet, rows, params, resolveColumn }) => {
  const cols = ((params as Params)?.columns ?? []);
  const headers = cols.map(ref => resolveColumn ? resolveColumn(ref) : ref);
  const errors: any[] = [];

  for (const h of headers) {
    const firstSeen = new Map<string, number>(); // value -> rowIndex
    rows.forEach((r, idx) => {
      const v = (r as any)[h];
      if (isBlank(v)) return; // ignore blanks for uniqueness
      const key = String(v);
      if (firstSeen.has(key)) {
        const firstRow = firstSeen.get(key)! + 2;
        errors.push({
          code: "RULE_UNIQUE",
          message: `Duplicate value "${key}" in "${h}" (first at row ${firstRow}).`,
          sheet,
          row: idx + 2,
          column: h,
          value: v,
          tuple: { ...r },
        });
      } else {
        firstSeen.set(key, idx);
      }
    });
  }

  return errors;
};
