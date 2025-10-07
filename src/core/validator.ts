import fs from "fs";
import { WorkbookSchema, type WorkbookSchemaT } from "./schema.js";
import type { ValidationError } from "./errors.js";
import { uniqueRule, mutuallyExclusiveRule, conditionalRequiredRule, type RuleFn } from "../rules/index.js";
import { loadWorkbook, sheetToRows } from "./reader.js";

const EMAIL_RE = /^(?!\.)(?!.*\.\.)[a-z0-9._+-]+(?<!\.)@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

// --- coercion helpers ---
const TRUE_SET  = new Set(["true","t","1","yes","y","si","sí"]);
const FALSE_SET = new Set(["false","f","0","no","n"]);

function isBlank(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function coerceBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number")  return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (TRUE_SET.has(s))  return true;
    if (FALSE_SET.has(s)) return false;
  }
  return null;
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    // Support "1,234.56" and "1.234,56"
    const commaAsDecimal = /,\d{1,}$/.test(s);
    const normalized = commaAsDecimal ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const ruleRegistry: Record<string, RuleFn> = {
  unique: uniqueRule,
  mutuallyExclusive: mutuallyExclusiveRule,
  conditionalRequired: conditionalRequiredRule
};

export type ValidateOptions = {
  allowExtraColumns?: boolean;
  returnData?: boolean;
};

export async function validateExcelAsync(
  excelPath: string,
  schemaPath: string,
  opts: ValidateOptions = {}
) {
  const rawSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const schema: WorkbookSchemaT = WorkbookSchema.parse(rawSchema);
  const wb = await loadWorkbook(excelPath);

  const errors: ValidationError[] = [];

  for (const sheetDef of schema) {
    const ws = wb.getWorksheet(sheetDef.tabname);
    if (!ws) {
      if (sheetDef.required) {
        errors.push({
          code: "SHEET_MISSING",
          message: `Missing required sheet: ${sheetDef.tabname}`,
          sheet: sheetDef.tabname
        });
      }
      continue;
    }

    const rows = sheetToRows(ws);

    if (rows.length < sheetDef.minRows) {
      errors.push({
        code: "MIN_ROWS",
        message: `Sheet "${sheetDef.tabname}" must have at least ${sheetDef.minRows} rows`,
        sheet: sheetDef.tabname
      });
    }

    const headers = Object.keys(rows[0] ?? {});
    const requiredCols = sheetDef.columns.filter((c) => c.required).map((c) => c.name);
    const missing = requiredCols.filter((c) => !headers.includes(c));
    if (missing.length) {
      errors.push({
        code: "REQUIRED_COLUMN_MISSING",
        message: `Sheet "${sheetDef.tabname}" missing required columns: ${missing.join(", ")}`,
        sheet: sheetDef.tabname
      });
    }

    if (!opts.allowExtraColumns && rows[0]) {
      const declared = new Set(sheetDef.columns.map((c) => c.name));
      const extras = Object.keys(rows[0]).filter((h) => !declared.has(h));
      // Optionally surface extras as warnings or ignore
      void extras;
    }

    rows.forEach((row, idx) => {
      for (const col of sheetDef.columns) {
        const raw = (row as any)[col.name];

        if (col.required && isBlank(raw)) {
          errors.push({
            code: "REQUIRED_CELL_EMPTY",
            message: `Row ${idx + 2}: Column "${col.name}" is required.`,
            sheet: sheetDef.tabname,
            row: idx + 2,
            column: col.name,
            tuple: { ...row }
          });
          continue;
        }

        if (isBlank(raw)) return; // nothing to validate

        // Try coercion for booleans/numbers; otherwise validate as-is
        let val: unknown = raw;
        if (col.type === "boolean") {
          const b = coerceBoolean(raw);
          if (b !== null) val = b;
        }
        if (col.type === "number") {
          const n = coerceNumber(raw);
          if (n !== null) val = n;
        }

        switch (col.type) {
          case "enum":
            if (col.allowedValues && !col.allowedValues.includes(String(val))) {
              errors.push({
                code: "INVALID_ENUM",
                message: `Row ${idx + 2}: Invalid enum value "${raw}" for column "${col.name}".`,
                sheet: sheetDef.tabname,
                row: idx + 2,
                column: col.name,
                value: raw,
                tuple: { ...row }
              });
            }
            break;

          case "email":
            if (!EMAIL_RE.test(String(val))) {
              errors.push({
                code: "INVALID_EMAIL",
                message: `Row ${idx + 2}: Invalid email in column "${col.name}".`,
                sheet: sheetDef.tabname,
                row: idx + 2,
                column: col.name,
                value: raw,
                tuple: { ...row }
              });
            }
            break;

          case "number":
            if (typeof val !== "number" || !Number.isFinite(val)) {
              errors.push({
                code: "TYPE_MISMATCH",
                message: `Row ${idx + 2}: Expected number in "${col.name}".`,
                sheet: sheetDef.tabname,
                row: idx + 2,
                column: col.name,
                value: raw,
                tuple: { ...row }
              });
            }
            break;

          case "boolean":
            if (typeof val !== "boolean") {
              errors.push({
                code: "TYPE_MISMATCH",
                message: `Row ${idx + 2}: Expected boolean in "${col.name}".`,
                sheet: sheetDef.tabname,
                row: idx + 2,
                column: col.name,
                value: raw,
                tuple: { ...row }
              });
            }
            break;

          default:
            // string: no strict check
            break;
        }

      }
    });

    if (sheetDef.rules) {
      for (const [ruleName, params] of Object.entries(sheetDef.rules)) {
        const ruleFn = ruleRegistry[ruleName];
        if (!ruleFn) continue;
        const ruleErrors = ruleFn({
          sheet: sheetDef.tabname,
          rows,
          params: params as Record<string, unknown>
        });
        errors.push(...ruleErrors);
      }
    }
  }

  return { success: errors.length === 0, errors };
}

export const validateExcel = validateExcelAsync;