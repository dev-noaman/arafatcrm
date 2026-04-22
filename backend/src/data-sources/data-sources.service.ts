import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DataSource } from "./data-source.entity";
import { CreateDataSourceDto } from "./dto/create-data-source.dto";
import { UpdateDataSourceDto } from "./dto/update-data-source.dto";

@Injectable()
export class DataSourcesService {
  constructor(
    @InjectRepository(DataSource)
    private repo: Repository<DataSource>,
  ) {}

  async findAll() {
    return this.repo.find({ order: { name: "ASC" } });
  }

  async findOne(id: string) {
    const ds = await this.repo.findOne({ where: { id } });
    if (!ds) throw new NotFoundException(`Data source ${id} not found`);
    return ds;
  }

  async create(dto: CreateDataSourceDto) {
    const ds = this.repo.create(dto);
    try {
      return await this.repo.save(ds);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("Data source with this name already exists");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateDataSourceDto) {
    const ds = await this.findOne(id);
    Object.assign(ds, dto);
    try {
      return await this.repo.save(ds);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("Data source with this name already exists");
      }
      throw error;
    }
  }

  async remove(id: string) {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Data source ${id} not found`);
    }
  }
}
