import { readFileSync } from "node:fs";
import ts from "typescript";
// Run pure domain checks on every supported Node release, without a device runtime.
export async function loadTypeScript(relative, from) {
  const source = readFileSync(new URL(relative, from), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}
