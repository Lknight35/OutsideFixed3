const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { getAssetData } = require("metro/private/Assets");

test("Metro development assets expose dimensions with the patched image parser", async () => {
  const icon = path.resolve(__dirname, "../assets/icon.png");
  const asset = await getAssetData(icon, "assets/icon.png", [], "android", "/assets");
  assert.equal(asset.width, 1024);
  assert.equal(asset.height, 1024);
  assert.deepEqual(asset.files, [icon]);
  assert.ok(asset.hash.length > 0);
});
