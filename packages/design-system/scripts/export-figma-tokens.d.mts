// Hand-written types for the exporter, which the unit tests import directly.
export const TOKENS_CSS: string;
export const TOKENS_JSON: string;
export function parseCssVariables(css: string): { name: string; value: string }[];
export function buildTokens(css: string, options?: { legacy?: boolean }): Record<string, unknown>;
export function renderTokens(options?: { legacy?: boolean }): string;
