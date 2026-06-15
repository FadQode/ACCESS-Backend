export const normalizeText = (value: string): string => value.trim();

export const normalizeOptionalText = (
  value: string | null | undefined,
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
