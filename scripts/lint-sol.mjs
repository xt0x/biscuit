import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const roots = ["contracts", "test"];
const files = [];

const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && fullPath.endsWith(".sol")) {
      files.push(fullPath);
    }
  }
};

for (const root of roots) {
  try {
    walk(root);
  } catch {
    // Directory doesn't exist yet.
  }
}

if (files.length === 0) {
  console.log("No Solidity files found. Skipping solhint.");
  process.exit(0);
}

const result = spawnSync("solhint", files, { stdio: "inherit" });
process.exit(result.status ?? 1);
