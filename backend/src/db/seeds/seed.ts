import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "../../users/user.entity";
import { Client } from "../../clients/client.entity";
import { Broker } from "../../brokers/broker.entity";
import { Deal } from "../../deals/deal.entity";
import { ClientSource, DealLocation, DealSpaceType, Currency, DealStatus } from "@arafat/shared";

export async function seed(dataSource: DataSource) {
  console.log("🌱 Starting database seed...");

  const userRepo = dataSource.getRepository(User);
  const clientRepo = dataSource.getRepository(Client);
  const brokerRepo = dataSource.getRepository(Broker);
  const dealRepo = dataSource.getRepository(Deal);

  // Check if already seeded
  const existingUsers = await userRepo.count();
  if (existingUsers > 0) {
    console.log("⚠️  Database already has data. Skipping seed.");
    return;
  }

  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10);

  const admin = userRepo.create({
    email: "admin@arafatcrm.com",
    password: hashedPassword,
    role: "admin",
    name: "Admin User",
    isActive: true,
  });

  const salesUser = userRepo.create({
    email: "sales@arafatcrm.com",
    password: hashedPassword,
    role: "sales",
    name: "Sales User",
    isActive: true,
  });

  await userRepo.save([admin, salesUser]);
  console.log("✅ Created users: admin, sales");

  // Create clients
  const clients: Client[] = [];
  const clientSources = [ClientSource.REFERRAL, ClientSource.GOOGLE, ClientSource.BROKER];

  for (let i = 1; i <= 10; i++) {
    clients.push(
      clientRepo.create({
        name: `Client ${i}`,
        email: `client${i}@example.com`,
        phone: `+974 5555 00${i.toString().padStart(2, "0")}`,
        source: clientSources[i % clientSources.length],
        company: `Company ${i}`,
        notes: `Sample notes for client ${i}`,
        assignedTo: i % 2 === 0 ? salesUser : null,
      }),
    );
  }

  await clientRepo.save(clients);
  console.log("✅ Created 10 clients");

  // Create brokers
  const brokers: Broker[] = [];
  for (let i = 1; i <= 5; i++) {
    brokers.push(
      brokerRepo.create({
        name: `Broker ${i}`,
        email: `broker${i}@example.com`,
        phone: `+974 5555 10${i.toString().padStart(2, "0")}`,
        company: `Brokerage Firm ${i}`,
        commissionRate: 1 + i * 0.5,
        notes: `Sample notes for broker ${i}`,
        managedBy: i % 2 === 0 ? salesUser : null,
      }),
    );
  }

  await brokerRepo.save(brokers);
  console.log("✅ Created 5 brokers");

  // Create deals
  const locations = Object.values(DealLocation);
  const spaceTypes = Object.values(DealSpaceType);
  const deals: Deal[] = [];

  for (let i = 1; i <= 15; i++) {
    const value = Math.floor(Math.random() * 50000) + 10000;
    const commissionRate = 2 + Math.random() * 3;
    deals.push(
      dealRepo.create({
        title: `Deal ${i} - ${clients[i % clients.length].name}`,
        value,
        status: i < 10 ? DealStatus.ACTIVE : i < 13 ? "won" : "lost",
        location: locations[i % locations.length],
        spaceType: spaceTypes[i % spaceTypes.length],
        currency: Currency.QAR,
        description: `Description for deal ${i}. This is a sample deal.`,
        propertyAddress: `Building ${i}, Street ${i}, Doha, Qatar`,
        commissionRate,
        commissionAmount: (value * commissionRate) / 100,
        expectedCloseDate: new Date(Date.now() + i * 86400000),
        stage: i < 5 ? "lead" : i < 8 ? "qualified" : i < 10 ? "proposal" : i < 13 ? "WON" : "LOST",
        isLost: i > 12,
        lossReason: i > 12 ? "Price too high" : null,
        client: clients[i % clients.length],
        broker: i % 3 === 0 ? brokers[i % brokers.length] : null,
        owner: i % 2 === 0 ? admin : salesUser,
        stageHistory: ["lead", "qualified", "proposal"].slice(0, (i % 3) + 1),
      }),
    );
  }

  await dealRepo.save(deals);
  console.log("✅ Created 15 deals");

  console.log("🎉 Database seeding completed successfully!");
  console.log(`   - Users: ${await userRepo.count()}`);
  console.log(`   - Clients: ${await clientRepo.count()}`);
  console.log(`   - Brokers: ${await brokerRepo.count()}`);
  console.log(`   - Deals: ${await dealRepo.count()}`);
}
