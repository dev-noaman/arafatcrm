import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { OfficerndController } from "./officernd.controller";
import { OfficerndService } from "./officernd.service";
import { OfficerndSync } from "./entities/officernd-sync.entity";
import { OfficerndSyncRun } from "./entities/officernd-sync-run.entity";
import { Deal } from "../deals/deal.entity";
import { Client } from "../clients/client.entity";
import { User } from "../users/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([OfficerndSync, OfficerndSyncRun, Deal, Client, User]),
    HttpModule,
  ],
  controllers: [OfficerndController],
  providers: [OfficerndService],
})
export class OfficerndModule {}
