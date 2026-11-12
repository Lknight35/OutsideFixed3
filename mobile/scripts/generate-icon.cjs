const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");
sharp(path.join(root, "assets/icon.svg"))
  .resize(1024, 1024)
  .png()
  .toFile(path.join(root, "assets/icon.png"));
