import type { RuleFn } from "./index.js";

export const mutuallyExclusiveRule: RuleFn = ({ sheet, rows, params }) => {
  const group: string[] = Array.isArray(params?.columns) ? (params!.columns as string[]) : [];
  const errors: any[] = [];

  rows.forEach((r, idx) => {
    const nonEmpty = group.filter((c) => r[c] !== null && r[c] !== undefined && r[c] !== "");
    if (nonEmpty.length > 1) {
      errors.push({
        code: "RULE_MUTUALLY_EXCLUSIVE",
        message: `Columns [${group.join(", ")}] are mutually exclusive; found multiple filled: ${nonEmpty.join(", ")}.`,
        sheet,
        row: idx + 2,
        tuple: { ...r }
      });
    }
  });

  return errors;
};
