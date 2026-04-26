import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ScheduleMeetingDto {
  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  meetingDate!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  meetingTime!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  meetingLocation!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  meetingNotes?: string;
}
