import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { Response } from "express";
import { BrokersService } from "./brokers.service";
import { CreateBrokerDto } from "./dto/create-broker.dto";
import { UpdateBrokerDto } from "./dto/update-broker.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { brokerDocStorage, documentFileFilter, DOC_UPLOAD_LIMITS } from "./broker-upload.helper";

@ApiTags("Brokers")
@ApiBearerAuth()
@Controller("brokers")
export class BrokersController {
  constructor(private readonly brokersService: BrokersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new broker" })
  create(@Body() dto: CreateBrokerDto) {
    return this.brokersService.create(dto);
  }

  @Post("bulk")
  @ApiOperation({ summary: "Bulk create brokers" })
  bulkCreate(@Body() dtos: CreateBrokerDto[]) {
    return this.brokersService.bulkCreate(dtos);
  }

  @Get()
  @ApiOperation({ summary: "List all brokers with pagination" })
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.brokersService.findAll(pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get broker by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.brokersService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update broker" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateBrokerDto) {
    return this.brokersService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete broker" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.brokersService.remove(id);
  }

  @Post(":id/documents")
  @ApiOperation({ summary: "Upload a document for a broker" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        docType: { type: "string", enum: ["QID", "CR", "TL", "COMPUTER_CARD", "OTHERS"] },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: brokerDocStorage,
      fileFilter: documentFileFilter,
      limits: DOC_UPLOAD_LIMITS,
    }),
  )
  async uploadDocument(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("docType") docType: string,
  ) {
    if (!file) throw new Error("No file uploaded");
    if (!docType) throw new Error("docType is required");
    return this.brokersService.addDocument(id, file, docType);
  }

  @Delete(":id/documents/:documentId")
  @ApiOperation({ summary: "Delete a broker document" })
  async removeDocument(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
  ) {
    await this.brokersService.removeDocument(id, documentId);
    return { success: true };
  }

  @Get(":id/documents/:documentId/download")
  @ApiOperation({ summary: "Download a broker document" })
  async downloadDocument(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.brokersService.getDocumentPath(documentId);
    res.download(filePath);
  }
}
