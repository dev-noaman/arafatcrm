import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Client } from "./client.entity";
import { ClientsService } from "./clients.service";
import { ClientsController } from "./clients.controller";
import { User } from "../users/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Client, User]), AuthModule],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
