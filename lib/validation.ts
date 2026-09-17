import { ApiError } from "./auth";

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "Request body must be an object.");
  return value as Record<string, unknown>;
}
export function text(value: unknown, field: string, options: { min?: number; max?: number; optional?: boolean } = {}) {
  if (value === undefined && options.optional) return undefined;
  if (typeof value !== "string" || value.trim().length < (options.min ?? 1) || value.trim().length > (options.max ?? 5000)) throw new ApiError(400, `${field} is invalid.`);
  return value.trim();
}
export function integer(value: unknown, field: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new ApiError(400, `${field} must be a positive integer.`);
  return parsed;
}
export function boolean(value: unknown, field: string, optional = false) {
  if (value === undefined && optional) return undefined;
  if (typeof value !== "boolean") throw new ApiError(400, `${field} must be a boolean.`);
  return value;
}
