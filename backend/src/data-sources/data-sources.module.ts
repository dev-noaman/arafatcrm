import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSourcesService } from "./data-sources.service";
import { DataSourcesController } from "./data-sources.controller";
import { DataSource } from "./data-source.entity";

@Module({
  imports: [TypeOrmModule.forFeature([DataSource])],
  providers: [DataSourcesService],
  controllers: [DataSourcesController],
  exports: [DataSourcesService],
})
export class DataSourcesModule {}
