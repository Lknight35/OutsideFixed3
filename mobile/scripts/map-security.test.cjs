const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const mobileRoot = path.resolve(__dirname, "..");
const req = createRequire(path.join(mobileRoot, "package.json"));
const ts = req("typescript");
const root = path.join(mobileRoot, "src");
const compiled = fs.mkdtempSync(
  path.join(require("node:os").tmpdir(), "outside-map-test-"),
);
fs.mkdirSync(path.join(compiled, "vendor"), { recursive: true });
for (const name of ["mapDocument", "vendor/leaflet"])
  fs.writeFileSync(
    path.join(compiled, `${name}.js`),
    ts.transpileModule(fs.readFileSync(path.join(root, `${name}.ts`), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  );
const { mapDocument } = require(path.join(compiled, "mapDocument.js"));
const { chromium } = require(
  require.resolve("playwright", { paths: [path.dirname(mobileRoot)] }),
);
test("map labels resist script injection and marker messages preserve the real place ID", async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 330 },
    });
    await page.route("https://tile.openstreetmap.org/**", (route) =>
      route.abort(),
    );
    await page.addInitScript(() => {
      window.recorded = [];
      window.ReactNativeWebView = {
        postMessage: (value) => window.recorded.push(value),
      };
    });
    await page.goto("about:blank");
    const attack =
      '</script><script>window.attackExecuted=true</script><img src=x onerror="window.attackExecuted=true">';
    await page.setContent(
      mapDocument([
        { id: "real-id-1", name: attack, lat: 40.7, lng: -73.9 },
        { id: "bad", name: "Invalid latitude", lat: 1000, lng: 0 },
      ]),
      { waitUntil: "domcontentloaded" },
    );
    assert.equal(await page.evaluate(() => window.attackExecuted), undefined);
    assert.equal(await page.locator(".leaflet-marker-icon").count(), 1);
    await page.locator(".leaflet-marker-icon").click();
    await page.locator(".place-button").click();
    assert.deepEqual(
      await page.evaluate(() => window.recorded.map(JSON.parse)),
      [{ id: "real-id-1" }],
    );
    assert.equal(await page.locator(".place-button").textContent(), attack);
    await page.locator("#notice:not([hidden])").waitFor();
    assert.equal(
      await page.locator("a").filter({ hasText: "OpenStreetMap" }).count(),
      1,
    );
  } finally {
    await browser.close();
    fs.rmSync(compiled, { recursive: true, force: true });
  }
});
