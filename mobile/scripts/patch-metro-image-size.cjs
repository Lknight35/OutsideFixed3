// Expo SDK 54's Metro passes image paths to image-size. Version 2.0.3 fixes
// parser denial-of-service advisories but accepts bytes instead of paths.
// Keep the patched parser and adapt only Metro's legacy argument boundary.
const fs = require("node:fs");
const path = require("node:path");
const metroManifest = require.resolve("metro/package.json");
const version = JSON.parse(fs.readFileSync(metroManifest, "utf8")).version;
if (version !== "0.83.3") {
  throw new Error(`Review the image-size compatibility patch for Metro ${version}.`);
}
const file = path.join(path.dirname(metroManifest), "src/Assets.js");
const original = "const dimensions = isImage ? (0, _imageSize.default)(isImageInput) : null;";
const patched = "const dimensions = isImage ? (0, _imageSize.default)(typeof isImageInput === \"string\" ? _fs.default.readFileSync(isImageInput) : isImageInput) : null;";
const source = fs.readFileSync(file, "utf8");
if (!source.includes(patched)) {
  if (!source.includes(original)) throw new Error("Metro asset loader changed; review the compatibility patch.");
  fs.writeFileSync(file, source.replace(original, patched));
}
console.log("Metro asset loader is compatible with image-size 2.0.3.");
