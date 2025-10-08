import type { RuleFn } from "./index.js";

type DateOrderCfg = {
  start: string; // key or header
  end: string;   // key or header
  message?: string;
};

const isBlank = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "");

// Simple, consistent date coercion for rules (add your Excel serial support if needed)
function toDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number") {
    // treat as Excel serial days since 1899-12-30
    const base = Date.UTC(1899, 11, 30);
    const d = new Date(base + v * 86400000);
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

export const dateOrderRule: RuleFn = ({ sheet, rows, params, resolveColumn }) => {
  const cfgs = Array.isArray(params) ? (params as DateOrderCfg[]) : [];
  const errors: any[] = [];

  for (const cfg of cfgs) {
    const startH = resolveColumn ? resolveColumn(cfg.start) : cfg.start;
    const endH   = resolveColumn ? resolveColumn(cfg.end)   : cfg.end;

    rows.forEach((r, idx) => {
      const sv = (r as any)[startH];
      const ev = (r as any)[endH];
      if (isBlank(sv) || isBlank(ev)) return; // leave required-ness to other rules

      const sd = toDate(sv);
      const ed = toDate(ev);
      if (!sd || !ed) {
        errors.push({
          code: "RULE_DATE_ORDER",
          message: `Invalid date in "${cfg.start}" or "${cfg.end}".`,
          sheet,
          row: idx + 2,
          tuple: { ...r },
        });
        return;
      }
      if (ed <= sd) {
        errors.push({
          code: "RULE_DATE_ORDER",
          message: cfg.message ?? `End date "${cfg.end}" must be after start date "${cfg.start}".`,
          sheet,
          row: idx + 2,
          tuple: { ...r },
        });
      }
    });
  }

  return errors;
};
