import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Broker } from "./broker.entity";
import { BrokerDocument } from "./broker-document.entity";
import { CreateBrokerDto } from "./dto/create-broker.dto";
import { UpdateBrokerDto } from "./dto/update-broker.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

@Injectable()
export class BrokersService {
  constructor(
    @InjectRepository(Broker)
    private brokersRepo: Repository<Broker>,
    @InjectRepository(BrokerDocument)
    private docsRepo: Repository<BrokerDocument>,
  ) {}

  async create(dto: CreateBrokerDto) {
    try {
      const broker = this.brokersRepo.create(dto);
      return await this.brokersRepo.save(broker);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("Broker with this email already exists");
      }
      throw error;
    }
  }

  async bulkCreate(dtos: CreateBrokerDto[]) {
    const results = { created: 0, errors: [] as { row: number; message: string }[] };
    for (let i = 0; i < dtos.length; i++) {
      try {
        const broker = this.brokersRepo.create(dtos[i]);
        await this.brokersRepo.save(broker);
        results.created++;
      } catch (error: any) {
        results.errors.push({ row: i + 1, message: error.code === "23505" ? "Email already exists" : error.message });
      }
    }
    return results;
  }

  async findAll(pagination: PaginationQueryDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.brokersRepo.findAndCount({
      relations: ["managedBy", "documents"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const broker = await this.brokersRepo.findOne({
      where: { id },
      relations: ["managedBy", "documents"],
    });

    if (!broker) {
      throw new NotFoundException(`Broker with ID ${id} not found`);
    }

    return broker;
  }

  async update(id: string, dto: UpdateBrokerDto) {
    const broker = await this.findOne(id);
    Object.assign(broker, dto);

    try {
      return await this.brokersRepo.save(broker);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("Broker with this email already exists");
      }
      throw error;
    }
  }

  async remove(id: string) {
    const broker = await this.findOne(id);
    for (const doc of broker.documents || []) {
      const filePath = join(process.cwd(), doc.path);
      if (existsSync(filePath)) unlinkSync(filePath);
    }
    const result = await this.brokersRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Broker with ID ${id} not found`);
    }
  }

  async addDocument(brokerId: string, file: Express.Multer.File, docType: string) {
    await this.findOne(brokerId);
    const doc = this.docsRepo.create({
      brokerId,
      docType,
      filename: file.filename,
      originalName: file.originalname,
      path: `uploads/broker-docs/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
    });
    return this.docsRepo.save(doc);
  }

  async removeDocument(brokerId: string, documentId: string) {
    await this.findOne(brokerId);
    const doc = await this.docsRepo.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }
    const filePath = join(process.cwd(), doc.path);
    if (existsSync(filePath)) unlinkSync(filePath);
    await this.docsRepo.delete(documentId);
  }

  async getDocumentPath(documentId: string) {
    const doc = await this.docsRepo.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }
    return join(process.cwd(), doc.path);
  }
}
