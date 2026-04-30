import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OfficerndSync } from "../officernd/entities/officernd-sync.entity";
import { Deal } from "../deals/deal.entity";
import { User } from "../users/user.entity";
import { OfficerndReportsController } from "./officernd-reports.controller";
import { OfficerndReportsService } from "./officernd-reports.service";

@Module({
  imports: [TypeOrmModule.forFeature([OfficerndSync, Deal, User])],
  controllers: [OfficerndReportsController],
  providers: [OfficerndReportsService],
})
export class OfficerndReportsModule {}
