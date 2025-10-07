
// --- coercion helpers ---
const TRUE_SET  = new Set(["true","t","1","yes","y","si","sí"]);
const FALSE_SET = new Set(["false","f","0","no","n"]);

export function isBlank(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

export function coerceBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number")  return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (TRUE_SET.has(s))  return true;
    if (FALSE_SET.has(s)) return false;
  }
  return null;
}

export function coerceNumber(v: unknown): number | null {
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

// ----- date & time helpers -----

// Excel's day 0 is 1899-12-30 (considering Excel's 1900 leap year bug behavior)
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }

export function normalizeDateISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function normalizeTimeHHMMSS(h: number, m: number, s: number): string {
  return `${pad2(h)}:${pad2(m)}:${pad2(Math.floor(s))}`;
}

export function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Accepts Date, Excel serial (number), or string -> returns Date (local time) or null */
export function coerceDate(value: unknown): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // Excel serial date (days since 1899-12-30)
  if (isFiniteNumber(value)) {
    const ms = EXCEL_EPOCH_UTC + value * MS_PER_DAY;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    // Accept common formats: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, MM/DD/YYYY, ISO with time
    // Let Date parse; if ambiguous locales matter, add your own parser here.
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/** Accepts string like HH:MM or HH:MM:SS, Excel time fraction (0..1), or Date -> normalized "HH:MM:SS" or null */
export function coerceTimeToHHMMSS(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return normalizeTimeHHMMSS(value.getHours(), value.getMinutes(), value.getSeconds());
  }

  // Excel time as fraction of day (e.g., 0.5 = 12:00)
  if (isFiniteNumber(value) && value >= 0 && value < 1) {
    const totalSeconds = Math.round(value * 24 * 60 * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return normalizeTimeHHMMSS(h, m, s);
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    // HH:MM or HH:MM:SS (24h)
    const m = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(s);
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    const ss = m[3] ? Number(m[3]) : 0;
    if (h < 0 || h > 23) return null;
    return normalizeTimeHHMMSS(h, mm, ss);
  }

  return null;
}