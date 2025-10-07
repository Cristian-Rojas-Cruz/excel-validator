import type { RuleFn } from "./index.js";

export const uniqueRule: RuleFn = ({ sheet, rows, params }) => {
  const cols: string[] = Array.isArray(params?.columns) ? (params!.columns as string[]) : [];
  const errors: any[] = [];

  for (const col of cols) {
    const seen = new Map<unknown, number>(); // value -> firstRow
    rows.forEach((r, idx) => {
      const val = r[col];
      if (val === null || val === undefined || val === "") return;
      if (seen.has(val)) {
        errors.push({
          code: "RULE_UNIQUE",
          message: `Duplicate value "${val}" in column "${col}".`,
          sheet,
          row: idx + 2,
          column: col,
          value: val,
          tuple: { ...r }
        });
      } else {
        seen.set(val, idx);
      }
    });
  }

  return errors;
};
