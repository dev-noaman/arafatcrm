import { SetMetadata } from "@nestjs/common";
import { Role } from "@arafat/shared";
import { ROLES_KEY } from "../guards/roles.guard";

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
