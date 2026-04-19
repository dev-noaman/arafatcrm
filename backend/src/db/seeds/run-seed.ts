import { dataSource } from "../../typeorm.config";
import { seed } from "./seeds/seed";

(async () => {
  try {
    await dataSource.initialize();
    console.log("✅ Database connection established");
    await seed(dataSource);
    await dataSource.destroy();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
})();
