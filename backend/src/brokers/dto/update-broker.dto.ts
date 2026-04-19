import { PartialType, OmitType, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { CreateBrokerDto } from "./create-broker.dto";

export class UpdateBrokerDto extends PartialType(
  OmitType(CreateBrokerDto, ["managedById"] as const),
) {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  managedById?: string;
}
