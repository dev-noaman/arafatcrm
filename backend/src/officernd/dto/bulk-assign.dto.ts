import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUUID, IsNotEmpty, ArrayNotEmpty } from "class-validator";

export class BulkAssignDto {
  @ApiProperty() @IsArray() @ArrayNotEmpty() @IsUUID("4", { each: true }) ids: string[] = [];
  @ApiProperty() @IsUUID() @IsNotEmpty() userId: string = "";
}
