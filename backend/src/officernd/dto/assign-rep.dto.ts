import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class AssignRepDto {
  @ApiProperty() @IsString() @IsNotEmpty() userId: string = "";
}
