import fs from "fs";
import { WorkbookSchema, type WorkbookSchemaT } from "./schema.js";
import type { ValidationError } from "./errors.js";
import {
  uniqueRule, mutuallyExclusiveRule, conditionalRequiredRule, type RuleFn,
  referencesRule, atLeastOneRequiredRule, allOrNoneRule, conditionalEnumRule, dateOrderRule
} from "../rules/index.js";
import { isBlank, coerceBoolean, coerceNumber, coerceDate, normalizeDateISO, coerceTimeToHHMMSS } from "./utils.js"

import { loadWorkbookFrom, sheetToRows, type ExcelInput } from "./reader.js";

const EMAIL_RE = /^(?!\.)(?!.*\.\.)[a-z0-9._+-]+(?<!\.)@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

// ----- Rules registry -----

const ruleRegistry: Record<string, RuleFn> = {
  unique: uniqueRule,
  mutuallyExclusive: mutuallyExclusiveRule,
  conditionalRequired: conditionalRequiredRule,
  references: referencesRule,
  atLeastOneRequired: atLeastOneRequiredRule,
  allOrNone: allOrNoneRule,
  conditionalEnum: conditionalEnumRule,
  dateOrder: dateOrderRule,
};

// ----- Rules registry -----

export type ValidateOptions = {
  allowExtraColumns?: boolean;
  returnData?: boolean;
};

export type ValidateResult = {
  success: boolean;
  errors: ValidationError[];
  data?: Record<string, Array<Record<string, unknown>>>;
};

// Overloads
export function validateExcelAsync(
  excel: ExcelInput,
  schema: WorkbookSchemaT,
  opts?: ValidateOptions
): Promise<ValidateResult>;

export function validateExcelAsync(
  excel: ExcelInput,
  schema: string | object,
  opts?: ValidateOptions
): Promise<ValidateResult>;


export async function validateExcelAsync(
  excel: ExcelInput,
  schemaInput: string | object | WorkbookSchemaT,
  opts: ValidateOptions = {}
): Promise<ValidateResult> {
    // --- Parse schema input (path | JSON string | object) ---
    let schemaObj: WorkbookSchemaT;
    if (typeof schemaInput === "string") {
      const s = schemaInput.trim();
      if (fs.existsSync(s)) {
        schemaObj = WorkbookSchema.parse(JSON.parse(fs.readFileSync(s, "utf8")));
      } else {
        schemaObj = WorkbookSchema.parse(JSON.parse(s));
      }
    } else {
      schemaObj = WorkbookSchema.parse(schemaInput);
    }


  // --- Load workbook from any of the supported inputs ---
  const wb = await loadWorkbookFrom(excel);

  const errors: ValidationError[] = [];
  const collectedData: Record<string, Array<Record<string, unknown>>> = {};

  const sheetRowsByName: Record<string, Array<Record<string, unknown>> | undefined> = {};
  for (const def of schemaObj) {
    const ws = wb.getWorksheet(def.tabname);
    sheetRowsByName[def.tabname] = ws ? sheetToRows(ws) : undefined;
  }

  // Build key->header maps per sheet from the schema (once)
  const nameByKeyPerSheet: Record<string, Record<string, string>> = {};
  for (const def of schemaObj) {
    const map: Record<string, string> = {};
    for (const col of def.columns) {
      const key = (col as any).key ?? col.name;
      map[key] = col.name;
    }
    nameByKeyPerSheet[def.tabname] = map;
  }
  const resolveOnSheet = (sheetName: string, ref: string) =>
    nameByKeyPerSheet[sheetName]?.[ref] ?? ref;


  for (const sheetDef of schemaObj) {
    const ws = wb.getWorksheet(sheetDef.tabname);
    if (!ws) {
      if (sheetDef.required) {
        errors.push({
          code: "SHEET_MISSING",
          message: `Missing required sheet: ${sheetDef.tabname}`,
          sheet: sheetDef.tabname,
        });
      }
      continue;
    }

    const rows = sheetRowsByName[sheetDef.tabname] ?? [];

    if (rows.length < sheetDef.minRows) {
      errors.push({
        code: "MIN_ROWS",
        message: `Sheet "${sheetDef.tabname}" must have at least ${sheetDef.minRows} rows`,
        sheet: sheetDef.tabname,
      });
    }


    let headers: string[] = [];
    {
      const headerRow = ws.getRow(1);
      const temp: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
        temp[col - 1] = cell.value ? String(cell.value).trim() : "";
      });
      headers = temp.filter(Boolean);
    }

    const requiredCols = sheetDef.columns.filter(c => c.required).map(c => c.name);
    const missing = requiredCols.filter(c => !headers.includes(c));

    if (missing.length) {
      errors.push({
        code: "REQUIRED_COLUMN_MISSING",
        message: `Sheet "${sheetDef.tabname}" missing required columns: ${missing.join(", ")}`,
        sheet: sheetDef.tabname,
      });
    }

    if (!opts.allowExtraColumns) {
      const declared = new Set(sheetDef.columns.map(c => c.name));
      const extras = headers.filter(h => !declared.has(h));
      void extras; // surface later if you want
    }

    const nameByKey = nameByKeyPerSheet[sheetDef.tabname] ?? {};
    const resolveColumn = (ref: string) => nameByKey[ref] ?? ref;

// -------- validation + data collection --------
const outRows: Array<Record<string, unknown>> = [];

rows.forEach((row, idx) => {
  const out: Record<string, unknown> = { rowNumber: idx + 2 };
  for (const col of sheetDef.columns) {
    const outKey = (col as any).key ?? col.name;
    const headerForCol = resolveColumn(outKey);
    const raw = (row as any)[headerForCol];
    let val: unknown = raw;

    // required / blank
    if (col.required && isBlank(raw)) {
      errors.push({
        code: "REQUIRED_CELL_EMPTY",
        message: `Row ${idx + 2}: Column "${col.name}" is required.`,
        sheet: sheetDef.tabname,
        row: idx + 2,
        column: headerForCol,
        tuple: { ...row },
      });
      out[outKey] = null;
      continue;
    }
    if (isBlank(raw)) {
      out[outKey] = null;
      continue;
    }

    // coercions
    if (col.type === "boolean") {
      const b = coerceBoolean(raw); if (b !== null) val = b;
    } else if (col.type === "number") {
      const n = coerceNumber(raw);  if (n !== null) val = n;
    }

    // validate
    switch (col.type) {
      case "enum":
        if (col.allowedValues && !col.allowedValues.includes(String(val))) {
          errors.push({ code: "INVALID_ENUM", message: `Row ${idx + 2}: Invalid enum value "${raw}" for column "${col.name}".`,
            sheet: sheetDef.tabname, row: idx + 2, column: col.name, value: raw, tuple: { ...row } });
        }
        break;
      case "email":
        if (!EMAIL_RE.test(String(val))) {
          errors.push({ code: "INVALID_EMAIL", message: `Row ${idx + 2}: Invalid email in column "${col.name}".`,
            sheet: sheetDef.tabname, row: idx + 2, column: col.name, value: raw, tuple: { ...row } });
        }
        break;
      case "number":
        if (typeof val !== "number" || !Number.isFinite(val)) {
          errors.push({ code: "TYPE_MISMATCH", message: `Row ${idx + 2}: Expected number in "${col.name}".`,
            sheet: sheetDef.tabname, row: idx + 2, column: col.name, value: raw, tuple: { ...row } });
        }
        break;
      case "boolean":
        if (typeof val !== "boolean") {
          errors.push({ code: "TYPE_MISMATCH", message: `Row ${idx + 2}: Expected boolean in "${col.name}".`,
            sheet: sheetDef.tabname, row: idx + 2, column: col.name, value: raw, tuple: { ...row } });
        }
        break;
      case "date": {
        const d = coerceDate(val);
        if (!d) {
          errors.push({ code: "TYPE_MISMATCH", message: `Row ${idx + 2}: Expected date in "${col.name}".`,
            sheet: sheetDef.tabname, row: idx + 2, column: col.name, value: raw, tuple: { ...row } });
        } else {
          val = normalizeDateISO(d);
        }
        break;
      }
      case "time": {
        const t = coerceTimeToHHMMSS(val);
        if (!t) {
          errors.push({ code: "TYPE_MISMATCH", message: `Row ${idx + 2}: Expected time (HH:MM or HH:MM:SS) in "${col.name}".`,
            sheet: sheetDef.tabname, row: idx + 2, column: col.name, value: raw, tuple: { ...row } });
        } else {
          val = t;
        }
        break;
      }
      default:
        // string: no strict check
        break;
    }

    out[outKey] = val;
  }
  outRows.push(out);
});


    // Run rules
    if (sheetDef.rules) {
      for (const [ruleName, params] of Object.entries(sheetDef.rules)) {

        const ruleFn = ruleRegistry[ruleName];
        if (!ruleFn) continue;
        const ruleErrors = ruleFn({
          sheet: sheetDef.tabname,
          rows,
          params: params as Record<string, unknown>,
          sheetRowsByName,
          resolveColumn,
          resolveOnSheet
        });
        errors.push(...ruleErrors);
      }
    }

    // Attach collected data for this sheet
    if (opts.returnData) {
      collectedData[sheetDef.tabname] = outRows;
    }
  }

  const result: ValidateResult = { success: errors.length === 0, errors };
  if (opts.returnData) result.data = collectedData;
  return result;
}

export const validateExcel = validateExcelAsync;