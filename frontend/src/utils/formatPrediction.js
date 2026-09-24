export function formatPrediction(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const numeric = Number(value);
  if (Math.abs(numeric) < 0.01) return "0.00";
  // Slice decimal digits instead of rounding; pad values such as 2.5 to 2.50.
  const [whole, fraction = ""] = String(numeric).split(".");
  return `${whole}.${fraction.padEnd(2, "0").slice(0, 2)}`;
}
