import { PartialType, OmitType, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { CreateClientDto } from "./create-client.dto";

export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ["assignedToId"] as const),
) {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignedToId?: string;
}
