import { execSync } from "child_process";
import fs from "fs";

function run(command: string, label: string) {
  try {
    console.log(`\n🔍 ${label}`);
    execSync(command, { stdio: "inherit" });
  } catch (err) {
    console.error(`\n❌ Failed: ${label}`);
    process.exit(1);
  }
}

// 1. TypeScript check
run("npx tsc --noEmit", "TypeScript type check");

// 2. Check tsconfig for path aliases
console.log("\n🔍 Checking tsconfig paths...");
const tsconfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf-8"));

if (!tsconfig.compilerOptions?.paths) {
  console.warn("⚠️ No path aliases configured (compilerOptions.paths missing)");
}

// 3. Check for @/ usage without config
const files = execSync('grep -r "@/" ./src || true').toString();

if (files && !tsconfig.compilerOptions?.paths) {
  console.error("❌ Detected @/ imports but no paths configured in tsconfig");
  process.exit(1);
}

// 4. Check environment file
if (!fs.existsSync(".env")) {
  console.warn("⚠️ Missing .env file");
}

// 5. Basic build check (optional)
// run("npm run build", "Build check");

console.log("\n✅ Preflight checks passed");
