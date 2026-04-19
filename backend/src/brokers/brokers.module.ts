import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Broker } from "./broker.entity";
import { BrokersService } from "./brokers.service";
import { BrokersController } from "./brokers.controller";
import { User } from "../users/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Broker, User])],
  providers: [BrokersService],
  controllers: [BrokersController],
  exports: [BrokersService],
})
export class BrokersModule {}
