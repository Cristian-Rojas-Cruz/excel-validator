import { describe, it, expect } from "vitest";
import path from "node:path";
import { validateExcelAsync } from "../src/core/validator.js";
import { runValidatorTest } from "./helper/runValidatorTest.js";

describe("Excel validator full coverage", () => {
    runValidatorTest({ name: "invalid_enum", expectedError: "INVALID_ENUM" });
    runValidatorTest({ name: "invalid_email", expectedError: "INVALID_EMAIL" });
    runValidatorTest({ name: "min_rows", expectedError: "MIN_ROWS" });
    runValidatorTest({ name: "missing_sheet", expectedError: "SHEET_MISSING" });
    runValidatorTest({ name: "required_cell_empty", expectedError: "REQUIRED_CELL_EMPTY" });
    runValidatorTest({ name: "required_column_missing", expectedError: "REQUIRED_COLUMN_MISSING" });
    runValidatorTest({ name: "rule_conditional_required", expectedError: "RULE_CONDITIONAL_REQUIRED" });
    runValidatorTest({ name: "rule_mutually_exclusive", expectedError: "RULE_MUTUALLY_EXCLUSIVE" });
    runValidatorTest({ name: "rule_unique", expectedError: "RULE_UNIQUE" });
    runValidatorTest({ name: "type_mismatch", expectedError: "TYPE_MISMATCH" });
});

describe("Custom Excel validation", () => {
  it("reports", async () => {        // <- mark test async
    const res = await validateExcelAsync(          // <- await the promise
      path.join(__dirname, "fixtures/custom_check/sample.xlsx"),
      path.join(__dirname, "fixtures/custom_check/schema.json"),
      {returnData:true}
    );

    console.log(JSON.stringify(res));
    expect(res.success).toBe(true);
    expect(res.errors.length === 0).toBe(true);
  });
});
