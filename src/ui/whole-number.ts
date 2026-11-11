export function parseWholeNumber(raw: string, max: number) {
  return Math.min(Number(raw.replace(/\D/g, "")) || 0, max);
}
