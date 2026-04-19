import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateAdminDto } from "./create-admin.dto";

export class UpdateUserDto extends PartialType(
  OmitType(CreateAdminDto, ["password"] as const),
) {}
