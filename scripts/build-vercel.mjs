import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

// 1. Build frontend static files
// Use absolute path: vite root is "client/", so relative paths resolve inside client/
const staticOutDir = resolve(process.cwd(), ".vercel/output/static");
run(`npx vite build --outDir ${staticOutDir}`);

// 2. Create function directory
mkdirSync(".vercel/output/functions/api/index.func", { recursive: true });

// 3. Bundle API as self-contained CJS (all deps included)
run(
  "npx esbuild server/vercel-entry.ts --bundle --platform=node --format=cjs --outfile=.vercel/output/functions/api/index.func/index.js"
);

// 4. Write function runtime config
writeFileSync(
  ".vercel/output/functions/api/index.func/.vc-config.json",
  JSON.stringify({ runtime: "nodejs20.x", handler: "index.js", launcherType: "Nodejs", maxDuration: 30 }, null, 2)
);

// 5. Write Vercel routing config
writeFileSync(
  ".vercel/output/config.json",
  JSON.stringify({
    version: 3,
    routes: [
      { src: "^/api(/.*)?$", dest: "/api/index" },
      { handle: "filesystem" },
      { src: "^/(.*)$", dest: "/index.html" },
    ],
  }, null, 2)
);

console.log("\nBuild Output API structure created successfully.");
