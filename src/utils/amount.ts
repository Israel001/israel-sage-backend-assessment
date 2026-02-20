import { HttpError } from "./http-error";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export function parseAmountToCents(input: number | string, fieldName = "amount"): number {
  if (typeof input !== "number" && typeof input !== "string") {
    throw new HttpError(400, `${fieldName} must be a number`, "INVALID_AMOUNT");
  }

  const normalized = String(input).trim();
  if (!MONEY_PATTERN.test(normalized)) {
    throw new HttpError(
      400,
      `${fieldName} must be a positive number with up to 2 decimal places`,
      "INVALID_AMOUNT"
    );
  }

  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new HttpError(400, `${fieldName} must be greater than 0`, "INVALID_AMOUNT");
  }

  return cents;
}

export function formatCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}
