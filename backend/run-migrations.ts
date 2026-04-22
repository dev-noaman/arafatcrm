import { DataSource } from "typeorm";
import { dataSourceOptions } from "./typeorm.config";

async function runMigrations() {
  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log("DataSource initialized");

    const migrations = await dataSource.runMigrations();
    console.log("Migrations completed:", migrations);

    await dataSource.destroy();
    console.log("DataSource destroyed");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
}

runMigrations();
