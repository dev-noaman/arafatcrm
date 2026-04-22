import { IsEmail, IsNotEmpty, IsOptional, IsString, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBrokerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  company?: string;

  @ApiProperty({ enum: ["PERSONAL", "CORPORATE"] })
  @IsString()
  @IsNotEmpty()
  brokerType!: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  contractFrom!: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  contractTo!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  managedById?: string;
}
