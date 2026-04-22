import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { DealLocation, DealSpaceType, Currency } from "@arafat/shared";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDealDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  value!: number;

  @ApiProperty({ enum: DealLocation })
  @IsEnum(DealLocation)
  @IsNotEmpty()
  location!: DealLocation;

  @ApiProperty({ enum: DealSpaceType })
  @IsEnum(DealSpaceType)
  @IsNotEmpty()
  spaceType!: DealSpaceType;

  @ApiPropertyOptional({ enum: Currency })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  propertyAddress?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  commissionRate?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expectedCloseDate?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brokerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ownerId?: string;
}
