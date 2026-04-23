import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, IsNotEmpty, ArrayNotEmpty } from "class-validator";

export class BulkAssignDto {
  @ApiProperty() @IsArray() @ArrayNotEmpty() @IsString({ each: true }) ids: string[] = [];
  @ApiProperty() @IsString() @IsNotEmpty() userId: string = "";
}
