import { PartialType, OmitType, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max, IsEnum } from "class-validator";
import { CreateDealDto } from "./create-deal.dto";
import { DealStage } from "@arafat/shared";

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

  @ApiPropertyOptional({ enum: DealStage })
  @IsEnum(DealStage)
  @IsOptional()
  stage?: DealStage;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isLost?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lossReason?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  confirmTerminal?: boolean;
}
