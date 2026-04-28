import { IsString, IsNotEmpty, IsUUID } from "class-validator";

export class GenerateBookingLinkDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  dealId!: string;
}
