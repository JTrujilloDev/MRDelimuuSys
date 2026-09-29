import { KitchenMode } from "../../generated/prisma/enums";

export const requirePositiveId = (value: unknown, field: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
};

export const requireName = (value: unknown, field = "name") => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }

  const normalized = value.trim();
  if (normalized.length > 100) {
    throw new Error(`${field} cannot exceed 100 characters`);
  }
  return normalized;
};

export const requireCode = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("code is required");
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9_]+$/.test(normalized)) {
    throw new Error("code can only contain letters, numbers, and underscores");
  }
  if (normalized.length > 50) {
    throw new Error("code cannot exceed 50 characters");
  }
  return normalized;
};

export const requireKitchenMode = (value: unknown) => {
  if (!Object.values(KitchenMode).includes(value as KitchenMode)) {
    throw new Error("Invalid kitchen mode");
  }
  return value as KitchenMode;
};

