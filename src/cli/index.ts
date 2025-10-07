#!/usr/bin/env node
import fs from "fs";
import { z } from "zod";
import { validateExcelAsync } from "../core/validator.js";

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const Argz = z.tuple([z.string(), z.string(), z.string().optional()]);

const parsed = Argz.safeParse(process.argv.slice(2));
if (!parsed.success) {
  die(`Usage: excel-validate <excelPath> <schemaPath> [output.json]`);
}
const [excelPath, schemaPath, outPath] = parsed.data;

const main = async () => {
  const result = await validateExcelAsync(excelPath, schemaPath);

  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  }

  if (result.success) {
    console.log("✅ Excel is valid!");
    process.exit(0);
  } else {
    console.error("❌ Validation errors:");
    for (const e of result.errors) {
      console.error(`- [${e.code}] ${e.sheet}${e.row ? `:${e.row}` : ""}${e.column ? `:${e.column}` : ""} → ${e.message}`);
    }
    process.exit(2);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
