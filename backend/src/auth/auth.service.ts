import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "../users/user.entity";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private jwtService: JwtService,
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
      role: "user",
    });

    await this.usersRepo.save(user);
    return this.login(user);
  }
}
