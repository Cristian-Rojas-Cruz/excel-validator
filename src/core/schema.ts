import { z } from "zod";

export const ColumnRule = z.object({
  name: z.string(),
  key: z.string().optional(), // Optional if you want an internal name
  required: z.boolean().default(false),
  type: z.enum(["string", "enum", "email", "number", "boolean"]).default("string"),
  allowedValues: z.array(z.string()).optional(),
});

export const SheetSchema = z.object({
  tabname: z.string(),
  required: z.boolean().default(true),
  minRows: z.number().int().nonnegative().default(0),
  columns: z.array(ColumnRule),
  rules: z.object({}).passthrough().optional() // free-form for rule params
});

export const WorkbookSchema = z.array(SheetSchema);
export type ColumnRuleT = z.infer<typeof ColumnRule>;
export type SheetSchemaT = z.infer<typeof SheetSchema>;
export type WorkbookSchemaT = z.infer<typeof WorkbookSchema>;