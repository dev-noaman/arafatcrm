import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GoogleToken } from "./calendar.entity";
import { CalendarService } from "./calendar.service";
import { CalendarController } from "./calendar.controller";
import { User } from "../users/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([GoogleToken, User])],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
