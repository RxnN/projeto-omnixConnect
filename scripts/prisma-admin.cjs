require("dotenv").config();

const { spawnSync } = require("node:child_process");
const path = require("node:path");

if (!process.env.DATABASE_ADMIN_URL) {
  console.error("DATABASE_ADMIN_URL não configurada no ambiente local.");
  process.exit(1);
}

const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_ADMIN_URL },
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
