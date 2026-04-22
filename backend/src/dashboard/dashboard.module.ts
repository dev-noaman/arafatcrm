import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { Deal } from "../deals/deal.entity";
import { Client } from "../clients/client.entity";
import { Broker } from "../brokers/broker.entity";
import { User } from "../users/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Deal, Client, Broker, User]), AuthModule],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
