import { IsArray, ArrayMinSize, ValidateNested, IsEmail, IsNotEmpty, IsString, IsOptional, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@arafat/shared";

class CsvUserRow {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: ["ADMIN", "SALES"], required: false })
  @IsString()
  @IsOptional()
  @IsIn(["ADMIN", "SALES"])
  role?: Role;
}

export class BulkCreateUsersDto {
  @ApiProperty({ type: [CsvUserRow] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CsvUserRow)
  users!: CsvUserRow[];
}
