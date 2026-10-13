// The backend sends LocalDateTime values in UTC without a zone ("2026-10-13T07:31:12").
// Browsers read such a string as LOCAL time, so it has to be marked as UTC first.
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

export const parseServerDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value !== "string" || !value) return new Date(NaN);
  return new Date(HAS_ZONE.test(value) ? value : `${value}Z`);
};