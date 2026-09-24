import test from "node:test";
import assert from "node:assert/strict";
import { buildTimeline } from "../src/utils/timeline.js";

test("all adjacent actual, interpolated and forecast points are connected exactly once", () => {
  const actuals = [{year:2020,value:10,source:"FIES"},{year:2021,value:11,source:"interpolated"},
    {year:2022,value:12,source:"FIES"}];
  const forecasts = [{year:2023,value:13},{year:2024,value:14},{year:2025,value:15}];
  const {points,segments} = buildTimeline(actuals,forecasts,"value","value","forecast");
  for (let i=1;i<points.length;i++) {
    const edges=segments.filter(s => points[i-1][s.key] != null && points[i][s.key] != null);
    assert.equal(edges.length,1);
  }
  assert.equal(points[1].actual,null);
  assert.equal(points[1].interpolated,11);
  assert.equal(points[2].forecast,null); // connector must not relabel actual values
});

test("new actuals replace overlapping forecasts and retained gap points stay sorted", () => {
  const {points} = buildTimeline([{year:2026,value:26,source:"FIES"}],
    [{year:2027,value:27},{year:2025,value:25},{year:2026,value:99},{year:2024,value:24}],"value","value","forecast");
  assert.deepEqual(points.map(p=>p.year),[2024,2025,2026,2027]);
  assert.equal(points[2].value,26);
  assert.equal(points[2].kind,"actual");
});

test("a null actual target does not hide an existing poverty prediction", () => {
  const {points} = buildTimeline([{year:2026,value:null,source:"APIS"}],
    [{year:2026,value:2}],"value","value","predicted");
  assert.equal(points[0].predicted,2);
});
