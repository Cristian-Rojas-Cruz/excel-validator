import type { ValidationError } from "../core/errors.js";

export type RuleContext = {
  sheet: string;
  rows: Array<Record<string, unknown>>;
  params?: Record<string, unknown>;

    /** All parsed rows by sheet name, for cross-sheet rules like `references` */
  sheetRowsByName?: Record<string, Array<Record<string, unknown>> | undefined>;
};

export type RuleFn = (ctx: RuleContext) => ValidationError[];

export { uniqueRule } from "./unique.js";
export { mutuallyExclusiveRule } from "./mutuallyExclusive.js";
export { conditionalRequiredRule } from "./conditionalRequired.js";
export { referencesRule } from "./references.js";
export { atLeastOneRequiredRule } from "./atLeastOneRequired.js";
export { allOrNoneRule } from "./allOrNone.js";
export { conditionalEnumRule } from "./conditionalEnum.js";
export { dateOrderRule } from "./dateOrder.js";