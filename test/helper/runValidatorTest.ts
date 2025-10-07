import { it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateExcelAsync } from "../../src/core/validator.js";
import type { ValidationError } from "../../src/core/errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ValidatorCase {
  /** Folder name under test/fixtures/<name>/{error,success} */
  name: string;
  /** Expected code for the error case (required) */
  expectedError: string;
  /**
   * Success verification mode:
   *  - "no-expected-error" (default): success must NOT include expectedError (other errors allowed)
   *  - "clean": success must have ZERO errors
   *  - "none": do not run success test
   */
  checkSuccess?: "no-expected-error" | "clean" | "none";
  /**
   * If true, the error case must contain ONLY the expected error code.
   * If false (default), it only needs to include it (others may appear).
   */
  onlyExpectedError?: boolean;
}

function fmtErrors(errors: ValidationError[]) {
  if (!errors.length) return "(no errors)";
  return errors
    .map(
      (e) =>
        `  - [${e.code}] ${e.sheet}${e.row ? `:${e.row}` : ""}${
          e.column ? `:${e.column}` : ""
        } → ${e.message}`
    )
    .join("\n");
}

/**
 * Runs validation on both error/ and success/ subfolders
 * under fixtures/<folder>, verifying only the specific case requested.
 */
export function runValidatorTest({
  name,
  expectedError,
  checkSuccess = "no-expected-error",
  onlyExpectedError = false,
}: ValidatorCase) {
  const baseDir = path.resolve(__dirname, `../fixtures/${name}`);

  it(`${name} → FAILS with ${expectedError}${onlyExpectedError ? " (only)" : ""}`, async () => {
    const errorExcel = path.join(baseDir, "error/sample.xlsx");
    const errorSchema = path.join(baseDir, "error/schema.json");

    const resErr = await validateExcelAsync(errorExcel, errorSchema);

    // console.log(resErr)
    expect(resErr.success).toBe(false);

    const includes = resErr.errors.some((e) => e.code === expectedError);
    expect(includes).toBe(true);

    if (onlyExpectedError) {
      const otherCodes = Array.from(new Set(resErr.errors.map((e) => e.code))).filter(
        (c) => c !== expectedError
      );
      expect(otherCodes).toHaveLength(0);
    }
  });

  if (checkSuccess !== "none") {
    it(
      `${name} → PASSES ${
        checkSuccess === "clean" ? "(no errors at all)" : `(no ${expectedError})`
      }`,
      async () => {
        const successExcel = path.join(baseDir, "success/sample.xlsx");
        const successSchema = path.join(baseDir, "success/schema.json");

        const resOk = await validateExcelAsync(successExcel, successSchema);

        if (checkSuccess === "clean") {
          expect(resOk.success).toBe(true);
          expect(resOk.errors).toHaveLength(0);
        } else {
          // "no-expected-error": only assert that the specific code is absent
          const hasExpected = resOk.errors.some((e) => e.code === expectedError);
          expect(hasExpected).toBe(false);
        }
      }
    );
  }
}
