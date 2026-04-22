import { ConfigModule } from "@nestjs/config";
import { DataSource, DataSourceOptions } from "typeorm";
import * as fs from "fs";
import * as path from "path";

// Load .env file manually (for CLI usage)
const envPath = path.resolve(__dirname, ".env");
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

// Also initialize ConfigModule for @nestjs/config compatibility
ConfigModule.forRoot();

export const dataSourceOptions = {
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [path.resolve(__dirname, "src/**/*.entity{.ts,.js}")],
  migrations: [path.resolve(__dirname, "src/db/migrations/*{.ts,.js}")],
  migrationsTableName: "migrations",
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
} satisfies DataSourceOptions;

export const dataSource = new DataSource(dataSourceOptions);
