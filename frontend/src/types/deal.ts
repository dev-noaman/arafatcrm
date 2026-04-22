import type { Client } from "./client";
import type { Broker } from "./broker";
import type { User } from "./auth";
import type { DealStatus, DealLocation, DealSpaceType, Currency } from "@arafat/shared";

export interface Deal {
  id: string;
  title: string;
  value: number;
  status: DealStatus;
  location: DealLocation;
  spaceType: DealSpaceType;
  currency: Currency;
  description: string | null;
  propertyAddress: string | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  expectedCloseDate: string | null;
  phone: string | null;
  stage: string;
  isLost: boolean;
  lossReason: string | null;
  client: Client;
  broker: Broker | null;
  owner: User;
  stageHistory: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDealDto {
  title: string;
  value: number;
  location: DealLocation;
  spaceType: DealSpaceType;
  currency?: Currency;
  description?: string;
  propertyAddress?: string;
  commissionRate?: number;
  expectedCloseDate?: string;
  clientId: string;
  brokerId?: string;
  ownerId?: string;
  phone?: string;
}

export interface UpdateDealDto {
  title?: string;
  value?: number;
  status?: DealStatus;
  location?: DealLocation;
  spaceType?: DealSpaceType;
  currency?: Currency;
  description?: string;
  propertyAddress?: string;
  commissionRate?: number;
  expectedCloseDate?: string;
  stage?: string;
  isLost?: boolean;
  lossReason?: string;
  confirmTerminal?: boolean;
}
