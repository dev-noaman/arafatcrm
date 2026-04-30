import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ScheduleModule } from "@nestjs/schedule";
import { join } from "path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { ClientsModule } from "./clients/clients.module";
import { BrokersModule } from "./brokers/brokers.module";
import { DealsModule } from "./deals/deals.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ReportsModule } from "./reports/reports.module";
import { DataSourcesModule } from "./data-sources/data-sources.module";
import { MailModule } from "./mail/mail.module";
import { TodosModule } from "./todos/todos.module";
import { OfficerndModule } from "./officernd/officernd.module";
import { OfficerndReportsModule } from "./officernd-reports/officernd-reports.module";
import { CalendarModule } from "./calendar/calendar.module";
import { JwtGuard, RolesGuard } from "./common/guards";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"),
      serveRoot: "/uploads",
      serveStaticOptions: { index: false },
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      logging: process.env.NODE_ENV === "development",
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "1h" },
      }),
    }),
    UsersModule,
    AuthModule,
    ClientsModule,
    BrokersModule,
    DealsModule,
    DashboardModule,
    ReportsModule,
    DataSourcesModule,
    ScheduleModule.forRoot(),
    MailModule,
    TodosModule,
    OfficerndModule,
    OfficerndReportsModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
