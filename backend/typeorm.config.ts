import { ConfigModule } from "@nestjs/config";
import { DataSource, DataSourceOptions } from "typeorm";

// Load environment variables (for local development)
ConfigModule.forRoot();

export const dataSourceOptions = {
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: ["src/**/*.entity{.ts,.js}"],
  migrations: ["src/db/migrations/*{.ts,.js}"],
  migrationsTableName: "migrations",
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
} satisfies DataSourceOptions;

export const dataSource = new DataSource(dataSourceOptions);
