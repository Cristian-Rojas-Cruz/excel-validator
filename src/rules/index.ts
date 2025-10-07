import type { ValidationError } from "../core/errors.js";

export type RuleContext = {
  sheet: string;
  rows: Array<Record<string, unknown>>;
  params?: Record<string, unknown>;
};

export type RuleFn = (ctx: RuleContext) => ValidationError[];

export { uniqueRule } from "./unique.js";
export { mutuallyExclusiveRule } from "./mutuallyExclusive.js";
export { conditionalRequiredRule } from "./conditionalRequired.js";