import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { Deal } from "../deals/deal.entity";
import { User } from "../users/user.entity";
import { Broker } from "../brokers/broker.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Deal, User, Broker])],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
