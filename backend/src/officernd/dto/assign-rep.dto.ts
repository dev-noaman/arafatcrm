import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsNotEmpty } from "class-validator";

export class AssignRepDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() userId: string = "";
}
