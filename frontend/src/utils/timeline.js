// One chronological path, with source-colored segments and truthful point labels.
export function buildTimeline(actuals, estimates, actualField, estimateField, futureKey) {
  const byYear = new Map();
  function put(row, field, kind) {
    if (row[field] == null || !Number.isFinite(Number(row[field]))) return;
    const year = Number(row.year);
    const value = Number(row[field]);
    byYear.set(year, { year, value, kind, actual: null, interpolated: null,
      [futureKey]: null, [kind]: value });
  }
  for (const row of estimates || []) put(row, estimateField, futureKey);
  for (const row of actuals || []) {
    const source = row.source?.toLowerCase();
    if (["forecast", "predicted"].includes(source)) continue;
    put(row, actualField, source === "interpolated" ? "interpolated" : "actual");
  }
  const points = [...byYear.values()].sort((a, b) => a.year - b.year);
  const segments = [];
  let active;
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1], current = points[i];
    const kinds = [previous.kind, current.kind];
    const kind = kinds.includes(futureKey) ? futureKey
      : kinds.includes("interpolated") ? "interpolated" : "actual";
    if (!active || active.kind !== kind) {
      active = { key: `segment_${segments.length}`, kind };
      segments.push(active);
    }
    previous[active.key] = previous.value;
    current[active.key] = current.value;
  }
  return { points, segments };
}
