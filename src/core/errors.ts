export type ValidationErrorCode =
  | "SHEET_MISSING"
  | "MIN_ROWS"
  | "REQUIRED_COLUMN_MISSING"
  | "REQUIRED_CELL_EMPTY"
  | "INVALID_ENUM"
  | "INVALID_EMAIL"
  | "TYPE_MISMATCH"
  | "RULE_UNIQUE"
  | "RULE_MUTUALLY_EXCLUSIVE"
  | "RULE_CONDITIONAL_REQUIRED";

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  sheet: string;
  row?: number;        // 1-based row (Excel-like)
  column?: string;     // header name
  value?: unknown;
  tuple?: Record<string, unknown>; // snapshot of the entire row
}