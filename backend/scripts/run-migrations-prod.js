/**
 * Production migration runner.
 *
 * Per CLAUDE.md note 23, the TypeORM CLI is forbidden on the VPS (it forks a
 * recursive Node process and DoS's the box). This script uses TypeORM's
 * DataSource API directly against the compiled migrations in dist/, which is
 * the explicitly permitted approach.
 *
 * Run from backend/ as: node scripts/run-migrations-prod.js
 */

const path = require("path");
const fs = require("fs");
const { DataSource } = require("typeorm");

// Load .env from backend/ root (mirrors typeorm.config.ts behaviour).
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    const trimmedKey = key && key.trim();
    if (trimmedKey && !trimmedKey.startsWith("#") && !process.env[trimmedKey]) {
      process.env[trimmedKey] = valueParts.join("=").trim();
    }
  });
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set; cannot run migrations.");
  process.exit(1);
}

const distRoot = path.resolve(__dirname, "..", "dist");
const ds = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [path.join(distRoot, "src", "**", "*.entity.js")],
  migrations: [path.join(distRoot, "src", "db", "migrations", "*.js")],
  migrationsTableName: "migrations",
  synchronize: false,
  logging: false,
});

(async () => {
  try {
    await ds.initialize();
    const applied = await ds.runMigrations();
    if (applied.length === 0) {
      console.log("No new migrations to run.");
    } else {
      console.log("Applied migrations:");
      applied.forEach((m) => console.log("  - " + m.name));
    }
    await ds.destroy();
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err && err.message ? err.message : err);
    process.exit(1);
  }
})();
