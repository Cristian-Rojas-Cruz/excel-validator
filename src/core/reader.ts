import ExcelJS from "exceljs";

/** Normalize ExcelJS cell values into primitives suitable for validation. */
function normalizeCellValue(v: ExcelJS.CellValue): unknown {
  if (v === null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;

  if (v instanceof Date) return v; // keep Date object if you want to add a date rule later

  // Formula values, hyperlinks, rich text, etc.
  if (typeof v === "object") {
    // Try to extract a useful primitive when possible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyV: any = v;
    if (anyV.text) return anyV.text;
    if (anyV.result !== undefined) return anyV.result;
    if (anyV.hyperlink) return anyV.hyperlink;
    if (anyV.richText) return String(anyV.richText.map((t: { text: string }) => t.text).join(""));
  }
  return String(v as unknown as string);
}

/**
 * Load workbook from path.
 */
export async function loadWorkbook(excelPath: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  // Speed options for read-only
  wb.creator = "excel-schema-validator";
  await wb.xlsx.readFile(excelPath);
  return wb;
}

/**
 * Read rows from a worksheet as array of objects {header: value}.
 * Assumes row 1 is the header row.
 */
export function sheetToRows(ws: ExcelJS.Worksheet): Array<Record<string, unknown>> {
  const headerRow = ws.getRow(1);
  const headers: string[] = [];

  // Build headers from first row (empty -> null)
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const name = cell.value ? String(cell.value).trim() : "";
    headers[colNumber - 1] = name;
  });

  const rows: Array<Record<string, unknown>> = [];
  const lastRow = ws.actualRowCount || ws.rowCount;

  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    if (!row || row.number === 0) continue;

    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (!h) return; // ignore un-named columns
      const cell = row.getCell(idx + 1);
      obj[h] = normalizeCellValue(cell.value);
    });

    // Skip completely empty rows (all null/undefined/"")
    const hasAny = Object.values(obj).some((v) => v !== null && v !== undefined && v !== "");
    if (hasAny) rows.push(obj);
  }

  return rows;
}
