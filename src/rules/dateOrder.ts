import type { RuleFn } from "./index.js";

type DateOrderCfg = {
  /** (optional) A label for the rule pointing to a single date column (unused here but kept for compatibility) */
  column?: string;
  start: string; // column name holding start date
  end: string;   // column name holding end date
  message?: string;
};

function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number") {
    // exceljs usually gives Date, but in case of serial number, treat as days from 1899-12-30
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 24 * 60 * 60 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export const dateOrderRule: RuleFn = ({ sheet, rows, params }) => {
  const cfgs = Array.isArray(params) ? (params as DateOrderCfg[]) : [];
  const errors: any[] = [];

  rows.forEach((r, idx) => {
    for (const cfg of cfgs) {
      const startV = (r as any)[cfg.start];
      const endV = (r as any)[cfg.end];

      if (startV == null || endV == null || String(startV).trim() === "" || String(endV).trim() === "") {
        // if either is blank, skip (let required/other rules handle blanks)
        continue;
      }

      const dStart = parseDate(startV);
      const dEnd = parseDate(endV);

      if (!dStart || !dEnd) {
        errors.push({
          code: "RULE_DATE_ORDER",
          message: `Invalid date format in "${cfg.start}" or "${cfg.end}".`,
          sheet,
          row: idx + 2,
          tuple: { ...r }
        });
        continue;
      }

      if (dEnd <= dStart) {
        errors.push({
          code: "RULE_DATE_ORDER",
          message: cfg.message ?? `End date "${cfg.end}" must be after start date "${cfg.start}".`,
          sheet,
          row: idx + 2,
          tuple: { ...r }
        });
      }
    }
  });

  return errors;
};
