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
  | "RULE_CONDITIONAL_REQUIRED"
  | "RULE_AT_LEAST_ONE_REQUIRED"
  | "RULE_CONDITIONAL_ENUM"
  | "RULE_DATE_ORDER"
  | "RULE_REFERENCE_NOT_FOUND"
  | "RULE_ALL_OR_NONE"
  | "RULE_CUSTOM";

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  sheet: string;
  row?: number;        // 1-based row (Excel-like)
  column?: string;     // header name
  value?: unknown;
  tuple?: Record<string, unknown>; // snapshot of the entire row
}