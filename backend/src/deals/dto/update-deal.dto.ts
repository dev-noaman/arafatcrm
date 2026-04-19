import { PartialType, OmitType, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";
import { CreateDealDto } from "./create-deal.dto";

export class UpdateDealDto extends PartialType(
  OmitType(CreateDealDto, ["clientId", "brokerId", "ownerId"] as const),
) {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brokerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  stage?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isLost?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lossReason?: string;
}
