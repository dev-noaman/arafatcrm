import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OfficerndSync } from "../officernd/entities/officernd-sync.entity";
import { Deal } from "../deals/deal.entity";
import { User } from "../users/user.entity";

@Injectable()
export class OfficerndReportsService {
  constructor(
    @InjectRepository(OfficerndSync) private syncRepo: Repository<OfficerndSync>,
    @InjectRepository(Deal) private dealsRepo: Repository<Deal>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}
}
