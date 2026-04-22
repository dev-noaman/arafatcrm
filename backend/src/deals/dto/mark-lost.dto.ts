import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class MarkLostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
