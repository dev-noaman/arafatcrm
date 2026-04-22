import { DataSource } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User } from "../../users/user.entity";
import { Client } from "../../clients/client.entity";
import { Broker } from "../../brokers/broker.entity";
import { Deal } from "../../deals/deal.entity";
import { ClientSource, DealLocation, DealSpaceType, Currency, DealStatus, DealStage } from "@arafat/shared";

export async function seed(dataSource: DataSource) {
  console.log("🌱 Starting database seed...");

  const userRepo = dataSource.getRepository(User);
  const clientRepo = dataSource.getRepository(Client);
  const brokerRepo = dataSource.getRepository(Broker);
  const dealRepo = dataSource.getRepository(Deal);

  // Clear existing data for fresh seed
  await dealRepo.delete({});
  await brokerRepo.delete({});
  await clientRepo.delete({});
  await userRepo.delete({});

  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10);

  const admin = userRepo.create({
    email: "admin@arafatcrm.com",
    password: hashedPassword,
    role: "ADMIN",
    name: "Admin User",
    isActive: true,
  });

  const salesUser1 = userRepo.create({
    email: "sales1@arafatcrm.com",
    password: hashedPassword,
    role: "SALES",
    name: "Ahmed Al-Mansouri",
    isActive: true,
  });

  const salesUser2 = userRepo.create({
    email: "sales2@arafatcrm.com",
    password: hashedPassword,
    role: "SALES",
    name: "Fatima Al-Thani",
    isActive: true,
  });

  await userRepo.save([admin, salesUser1, salesUser2]);
  console.log("✅ Created 3 users");

  // Create clients with varied sources
  const clients: Client[] = [];
  const clientSources = Object.values(ClientSource);

  const clientData = [
    { name: "Mohammed Al-Rashid", email: "mohammed.rashid@example.com", company: "Gulf Trading Est." },
    { name: "Khalid Al-Obaidly", email: "k.alobaidly@qatarcorp.qa", company: "Qatar Corp" },
    { name: "Sarah Johnson", email: "sarah.j@techstart.io", company: "TechStart Solutions" },
    { name: "Ahmed Hassan", email: "a.hassan@pearlgroup.qa", company: "Pearl Group" },
    { name: "Noor Al-Kuwari", email: "noor.k@investqa.com", company: "InvestQA" },
    { name: "David Miller", email: "d.miller@globalventures.com", company: "Global Ventures" },
    { name: "Maryam Al-Attiyah", email: "m.attyiah@dohaholdings.qa", company: "Doha Holdings" },
    { name: "Omar Farooq", email: "o.farooq@summitqa.qa", company: "Summit Qatar" },
    { name: "Lisa Chen", email: "l.chen@asiapacific.com", company: "Asia Pacific Ltd" },
    { name: "Ali Al-Sulaiti", email: "a.sulaiti@horizonqa.qa", company: "Horizon Qatar" },
    { name: "Emma Williams", email: "e.williams@eurotech.eu", company: "EuroTech" },
    { name: "Hamad Al-Mohannadi", email: "h.mohannadi@wahaqa.qa", company: "Waha Qatar" },
  ];

  for (let i = 0; i < clientData.length; i++) {
    const data = clientData[i];
    const client = clientRepo.create({
      name: data.name,
      email: data.email,
      phone: `+974 ${4000 + i} ${1000 + i}`,
      source: clientSources[i % clientSources.length],
      company: data.company,
      notes: `Sample notes for ${data.name}. Interested in premium office spaces.`,
    });
    if (i % 2 === 0 || i % 3 === 0) {
      client.assignedTo = i % 2 === 0 ? salesUser1 : salesUser2;
    }
    clients.push(client);
  }

  await clientRepo.save(clients);
  console.log(`✅ Created ${clients.length} clients`);

  // Create brokers
  const brokers: Broker[] = [];
  const brokerData = [
    { name: "Al-Mana Real Estate", email: "info@almana-re.ae", company: "Al-Mana Group", type: "CORPORATE" },
    { name: "Qatar Property Advisors", email: "advisors@qatarprop.qa", company: "QPA", type: "CORPORATE" },
    { name: "Gulf Intermediary", email: "contact@gulfinter.qa", company: "Gulf Inter", type: "CORPORATE" },
    { name: "Doha Brokers LLC", email: "hello@dohabrokers.qa", company: "Doha Brokers", type: "CORPORATE" },
    { name: "Mohammed Al-Kuwari", email: "m.kuwari@gmail.com", company: "", type: "PERSONAL" },
    { name: "Fatima Al-Noaimi", email: "f.noaimi@hotmail.com", company: "", type: "PERSONAL" },
  ];

  for (let i = 0; i < brokerData.length; i++) {
    const data = brokerData[i];
    const contractStart = new Date();
    contractStart.setMonth(contractStart.getMonth() - (6 - i));
    const contractEnd = new Date(contractStart);
    contractEnd.setMonth(contractEnd.getMonth() + 12);

    const broker = brokerRepo.create({
      name: data.name,
      email: data.email,
      phone: `+974 ${4400 + i} ${2000 + i}`,
      company: data.company || undefined,
      brokerType: data.type,
      contractFrom: contractStart,
      contractTo: contractEnd,
      isActive: true,
      notes: `Trusted partner. Specializes in ${i % 2 === 0 ? "commercial" : "residential"} properties.`,
    });
    broker.managedBy = i % 2 === 0 ? salesUser1 : salesUser2;
    brokers.push(broker);
  }

  await brokerRepo.save(brokers);
  console.log(`✅ Created ${brokers.length} brokers`);

  // Create deals with realistic data
  const deals: Deal[] = [];
  const locations = Object.values(DealLocation);
  const spaceTypes = Object.values(DealSpaceType);
  const stages = Object.values(DealStage);
  const activeStages = stages.filter(s => s !== "WON" && s !== "LOST");

  const dealTitles = [
    "Westbay Office Expansion", "Lusail Marina Workspace", "Al Sadd Business Center",
    "The Pearl Office Suite", "Diplomatic Area Headquarters", "Education City Tech Hub",
    "Katara Cultural Village Office", "Barwa City Commercial", "Mushaireb Business District",
    "Corniche Tower Offices", "Al Dafna Business Center", "QIC District Office",
    "Najma Commercial Space", "Bin Mahmoud Office Park", "Fereej Abdul Aziz Hub",
  ];

  for (let i = 0; i < dealTitles.length; i++) {
    const value = (Math.floor(Math.random() * 150) + 10) * 1000; // 10,000 - 160,000 QAR
    const client = clients[i % clients.length];
    const broker = i % 2 === 0 ? brokers[i % brokers.length] : undefined;
    const owner = i % 3 === 0 ? admin : i % 3 === 1 ? salesUser1 : salesUser2;

    let status: DealStatus;
    let stage: string;
    let isLost = false;
    let lossReason: string | undefined = undefined;

    if (i < 8) {
      status = DealStatus.ACTIVE;
      stage = activeStages[i % activeStages.length];
    } else if (i < 12) {
      status = DealStatus.WON;
      stage = "WON";
    } else {
      status = DealStatus.LOST;
      stage = "LOST";
      isLost = true;
      lossReason = ["Price too high", "Chose competitor", "Budget cut", "Timeline mismatch"][i % 4];
    }

    const deal = dealRepo.create({
      title: dealTitles[i],
      value,
      status,
      location: locations[i % locations.length],
      spaceType: spaceTypes[i % spaceTypes.length],
      currency: Currency.QAR,
      description: `Prime ${spaceTypes[i % spaceTypes.length].toLowerCase()} opportunity in ${locations[i % locations.length].replace("_", " ")}. Features modern amenities and excellent connectivity.`,
      propertyAddress: `Building ${i + 1}, Zone ${String.fromCharCode(65 + (i % 5))}, Doha, Qatar`,
      commissionRate: broker ? 50 : null,
      commissionAmount: broker ? Math.round(value / 2) : null,
      expectedCloseDate: new Date(Date.now() + (i + 7) * 86400000),
      stage,
      isLost,
      client,
      owner,
    });

    if (broker) {
      deal.broker = broker;
    }
    if (lossReason) {
      deal.lossReason = lossReason;
    }

    deals.push(deal);
  }

  await dealRepo.save(deals);
  console.log(`✅ Created ${deals.length} deals`);

  console.log("\n🎉 Database seeding completed successfully!");
  console.log(`   - Users:    ${await userRepo.count()}`);
  console.log(`   - Clients:  ${await clientRepo.count()}`);
  console.log(`   - Brokers:  ${await brokerRepo.count()}`);
  console.log(`   - Deals:    ${await dealRepo.count()}`);
  console.log("\n📝 Login credentials:");
  console.log("   admin@arafatcrm.com / password123");
  console.log("   sales1@arafatcrm.com / password123");
  console.log("   sales2@arafatcrm.com / password123");
}
