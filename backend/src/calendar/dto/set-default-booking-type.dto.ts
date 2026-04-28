import { IsString, IsNotEmpty } from "class-validator";

export class SetDefaultBookingTypeDto {
  @IsString()
  @IsNotEmpty()
  bookingTypeId!: string;
}
