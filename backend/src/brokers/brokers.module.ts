import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Broker } from "./broker.entity";
import { BrokerDocument } from "./broker-document.entity";
import { BrokersService } from "./brokers.service";
import { BrokersController } from "./brokers.controller";
import { User } from "../users/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Broker, BrokerDocument, User]), AuthModule],
  providers: [BrokersService],
  controllers: [BrokersController],
  exports: [BrokersService],
})
export class BrokersModule {}
