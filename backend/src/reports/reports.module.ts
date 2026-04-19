import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { Deal } from "../deals/deal.entity";
import { User } from "../users/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Deal, User])],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
