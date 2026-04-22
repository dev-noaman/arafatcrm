import { DealStage, DealLocation, DealSpaceType, Currency } from "../enums";
import { ClientDto } from "./client";
import { BrokerDto } from "./broker";
import { UserDto } from "./user";
export interface DealDto {
    id: string;
    client: ClientDto;
    broker: BrokerDto | null;
    paymentTerms: string | null;
    currency: Currency;
    expectedValue: string;
    expectedCloseDate: string;
    stage: DealStage;
    location: DealLocation;
    spaceType: DealSpaceType;
    createdBy: UserDto;
    createdAt: string;
    updatedAt: string;
}
export interface CreateDealDto {
    clientId: string;
    brokerId?: string | null;
    paymentTerms?: string | null;
    expectedValue: number;
    expectedCloseDate: string;
    stage?: DealStage;
    location: DealLocation;
    spaceType: DealSpaceType;
}
export type UpdateDealDto = Partial<Omit<CreateDealDto, "stage">>;
export interface UpdateStageDto {
    stage: DealStage;
    confirmTerminal?: boolean;
}
export interface ReassignOwnerDto {
    userId: string;
}
export interface DealStageHistoryDto {
    id: string;
    dealId: string;
    fromStage: DealStage | null;
    toStage: DealStage;
    changedBy: UserDto;
    changedAt: string;
}
