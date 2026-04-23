import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUUID, ArrayNotEmpty } from "class-validator";

export class BulkSendToPipelineDto {
  @ApiProperty() @IsArray() @ArrayNotEmpty() @IsUUID("4", { each: true }) ids: string[] = [];
}
