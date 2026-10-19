// Display only: truncate decimal digits without changing source values.
export function formatNumber(value, useGrouping = false) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  const numeric = Number(value);
  if (Math.abs(numeric) < 0.01) return "0.00";
  const [coefficient, exponent = "0"] = String(Math.abs(numeric)).split("e");
  const [integer, fraction = ""] = coefficient.split(".");
  const digits = integer + fraction;
  const point = integer.length + Number(exponent);
  const expanded = point <= 0
    ? `0.${"0".repeat(-point)}${digits}`
    : `${digits.padEnd(point, "0").slice(0, point)}.${digits.slice(point)}`;
  let [whole, decimals = ""] = expanded.split(".");
  if (useGrouping === true) whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${numeric < 0 ? "-" : ""}${whole}.${decimals.padEnd(2, "0").slice(0, 2)}`;
}
