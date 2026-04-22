import * as fs from "fs";
import * as path from "path";
import { DataSource } from "typeorm";

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    const trimmedKey = key?.trim();
    if (trimmedKey && !trimmedKey.startsWith("#") && !process.env[trimmedKey]) {
      process.env[trimmedKey] = valueParts.join("=").trim();
    }
  });
}

const dataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [],
});

(async () => {
  try {
    await dataSource.initialize();
    const results = await dataSource.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('clients', 'brokers', 'deals') ORDER BY table_name, column_name"
    );
    console.log("Database columns:");
    results.forEach((r: any) => console.log(`  ${r.table_name}.${r.column_name}`));
    await dataSource.destroy();
  } catch (e: any) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
