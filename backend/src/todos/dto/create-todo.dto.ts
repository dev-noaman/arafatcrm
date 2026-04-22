import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTodoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text!: string;
}
