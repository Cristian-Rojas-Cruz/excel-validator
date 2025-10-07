import type { RuleFn } from "./index.js";

/**
 * params:
 *  - when: { column: string, equals: any }   // simple case
 *  - thenRequired: string[]                  // columns required if condition met
 */
export const conditionalRequiredRule: RuleFn = ({ sheet, rows, params }) => {
  const when = params?.when as { column: string; equals: unknown };
  const thenReq: string[] = Array.isArray(params?.thenRequired) ? (params!.thenRequired as string[]) : [];
  const errors: any[] = [];

  rows.forEach((r, idx) => {
    if (when && r[when.column] === when.equals) {
      for (const c of thenReq) {
        const v = r[c];
        if (v === null || v === undefined || v === "") {
          errors.push({
            code: "RULE_CONDITIONAL_REQUIRED",
            message: `Column "${c}" is required when ${when.column} == ${String(when.equals)}.`,
            sheet,
            row: idx + 2,
            column: c,
            tuple: { ...r }
          });
        }
      }
    }
  });

  return errors;
};
