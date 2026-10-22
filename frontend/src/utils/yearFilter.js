export function availableYears(rows = []) {
  return [...new Set(rows.map((row) => Number(row.year)).filter((year) => Number.isInteger(year) && year > 0))].sort((a, b) => a - b);
}

export function matchesYearRange(value, { startYear, endYear }) {
  if (!startYear && !endYear) return true;
  const year = Number(value);
  if (!Number.isInteger(year) || year <= 0) return false;
  return (!startYear || year >= Number(startYear)) && (!endYear || year <= Number(endYear));
}
