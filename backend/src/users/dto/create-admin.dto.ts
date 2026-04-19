import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Role } from "@arafat/shared";
import { ApiProperty } from "@nestjs/swagger";

export class CreateAdminDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: Role, required: false })
  @IsString()
  @IsOptional()
  role?: Role;
}
