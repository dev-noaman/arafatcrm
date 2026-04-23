import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, ArrayNotEmpty } from "class-validator";

export class BulkSendToPipelineDto {
  @ApiProperty() @IsArray() @ArrayNotEmpty() @IsString({ each: true }) ids: string[] = [];
}
