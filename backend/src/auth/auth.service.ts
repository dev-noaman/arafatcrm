import { Injectable, Logger, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { User } from "../users/user.entity";
import { LoginDto, RegisterDto, UpdateProfileDto } from "./dto/auth.dto";
import { MailService } from "../mail/mail.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepo.findOne({
      where: { email },
      select: ["id", "email", "password", "role", "name", "isActive"],
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return null;
    }

    return user;
  }

  async login(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async authenticate(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.login(user);
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new UnauthorizedException("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: "SALES",
    });

    await this.usersRepo.save(user);
    return this.login(user);
  }

  async getProfile(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId }, select: ["id", "email", "password", "name", "role"] });
    if (!user) throw new UnauthorizedException();

    if (dto.newPassword) {
      if (!dto.currentPassword) throw new BadRequestException("Current password is required to set a new password");
      const match = await bcrypt.compare(dto.currentPassword, user.password);
      if (!match) throw new BadRequestException("Current password is incorrect");
      (user as any).password = await bcrypt.hash(dto.newPassword, 10);
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;

    await this.usersRepo.save(user);
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      return { message: "If an account exists, a reset email has been sent." };
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = token;
    user.passwordResetExpires = expires;
    await this.usersRepo.save(user);

    const resetUrl = `https://arafatcrm.cloud/auth/reset-password?token=${token}`;
    try {
      await this.mailService.sendPasswordReset(user.email, resetUrl);
    } catch (err: any) {
      this.logger.warn(`Failed to send password reset email: ${err?.message}`);
      this.logger.log(`Password reset URL for ${user.email}: ${resetUrl}`);
    }

    return { message: "If an account exists, a reset email has been sent." };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.usersRepo.findOne({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException("Invalid or expired token");
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.usersRepo.save(user);

    return { message: "Password has been reset successfully." };
  }
}
