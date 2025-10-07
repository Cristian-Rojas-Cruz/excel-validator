import ExcelJS from "exceljs";

export type ExcelInput =
  | string                // file path
  | ArrayBuffer
  | Uint8Array
  | Buffer
  | File;                 // browser File

function toArrayBuffer(data: Uint8Array | Buffer): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

export async function loadWorkbookFrom(input: ExcelInput): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();

  if (typeof input === "string") {
    // Node fs path
    await wb.xlsx.readFile(input);
    return wb;
  }

  // Browser File
  if (typeof File !== "undefined" && input instanceof File) {
    const ab = await input.arrayBuffer();
    await wb.xlsx.load(ab);
    return wb;
  }

  if (input instanceof ArrayBuffer) {
    await wb.xlsx.load(input);
    return wb;
  }

  // Uint8Array or Node Buffer
  if (input && typeof (input as any).byteLength === "number") {
    const ab = toArrayBuffer(input as Uint8Array);
    await wb.xlsx.load(ab);
    return wb;
  }

  throw new Error("Unsupported excel input type for loadWorkbookFrom()");
}

/** Existing helper kept as-is for path-based reads */
export async function loadWorkbook(excelPath: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  return wb;
}

export function sheetToRows(ws: ExcelJS.Worksheet): Array<Record<string, unknown>> {
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.value ? String(cell.value).trim() : "";
  });

  const rows: Array<Record<string, unknown>> = [];
  const lastRow = ws.actualRowCount || ws.rowCount;

  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const cell = row.getCell(idx + 1);
      obj[h] = cell.value === undefined ? null : cell.value;
    });
    const hasAny = Object.values(obj).some(v => v !== null && v !== undefined && v !== "");
    if (hasAny) rows.push(obj);
  }
  return rows;
}
