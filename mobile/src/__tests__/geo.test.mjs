import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";
const { distanceMetersBetween, nearDestination } = await loadTypeScript(
  "../geo.ts",
  import.meta.url,
);
test("nearby discovery excludes distant provider matches and orders by actual distance", () => {
  const origin = { lat: 40.7829, lng: -73.9654 };
  const result = nearDestination(origin, [
    { id: "far", lat: 51.5072, lng: -0.1276 },
    { id: "close", lat: 40.783, lng: -73.9654 },
    { id: "near", lat: 40.75, lng: -73.99 },
  ]);
  assert.deepEqual(
    result.map((p) => p.id),
    ["close", "near"],
  );
  assert.ok(result[0].distanceMeters < 20);
  assert.ok(result[1].distanceMeters > 3000);
});
test("distance is correct across longitude wrap and rejects invalid coordinates", () => {
  const across = distanceMetersBetween(
    { lat: 0, lng: 179.99 },
    { lat: 0, lng: -179.99 },
  );
  assert.ok(across > 2200 && across < 2250);
  assert.equal(
    distanceMetersBetween({ lat: NaN, lng: 0 }, { lat: 0, lng: 0 }),
    Infinity,
  );
  assert.equal(
    distanceMetersBetween({ lat: 91, lng: 0 }, { lat: 0, lng: 0 }),
    Infinity,
  );
});
