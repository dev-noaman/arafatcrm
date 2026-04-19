import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Client } from "./client.entity";
import { ClientsService } from "./clients.service";
import { ClientsController } from "./clients.controller";
import { User } from "../users/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Client, User])],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
