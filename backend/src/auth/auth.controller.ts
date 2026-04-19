import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { JwtGuard } from "../common/guards";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  async login(@Body() dto: LoginDto) {
    return this.authService.authenticate(dto);
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("refresh")
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: "Refresh access token (placeholder)" })
  async refreshToken(@Request() req) {
    // TODO: Implement refresh token logic with database storage
    return this.authService.login(req.user);
  }
}
