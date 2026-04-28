import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TidyCalToken } from "./calendar.entity";
import { CalendarService } from "./calendar.service";
import { CalendarController } from "./calendar.controller";
import { DealsModule } from "../deals/deals.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([TidyCalToken]),
    forwardRef(() => DealsModule),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
