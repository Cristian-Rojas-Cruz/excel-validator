import type { RuleFn } from "./index.js";

const isBlank = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

export const allOrNoneRule: RuleFn = ({ sheet, rows, params, resolveColumn }) => {
  const groups = Array.isArray(params) ? (params as string[][]) : [];
  const errors: any[] = []; // if you have a ValidationError type, use that instead of any[]

  const toHeader = (ref: string) => (resolveColumn ? resolveColumn(ref) : ref);

  for (const group of groups) {
    const headers = group.map(toHeader);

    rows.forEach((r, idx) => {
      // determine which are blank
      const blanks = headers.map((h) => isBlank((r as any)[h]));
      const filledCount = blanks.filter((b) => !b).length;

      // valid if all blank or all filled
      if (filledCount === 0 || filledCount === headers.length) return;

      // otherwise, some are blank and some are filled → violation
      const missingHeaders = headers.filter((_, i) => blanks[i]);

      errors.push({
        code: "RULE_ALL_OR_NONE",
        message: `All-or-none violation. Either fill all or none of [${group.join(
          ", "
        )}] (resolved: [${headers.join(", ")}]). Missing: [${missingHeaders.join(", ")}].`,
        sheet,
        row: idx + 2,
        tuple: { ...r },
      });
    });
  }

  return errors;
};
