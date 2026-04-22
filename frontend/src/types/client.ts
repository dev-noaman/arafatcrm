import type { User } from "./auth";
import type { ClientSource } from "@arafat/shared";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: ClientSource;
  company: string | null;
  notes: string | null;
  assignedTo: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name: string;
  email: string;
  phone?: string;
  source?: ClientSource;
  company?: string;
  notes?: string;
  assignedToId?: string;
}

export interface UpdateClientDto {
  name?: string;
  email?: string;
  phone?: string;
  source?: ClientSource;
  company?: string;
  notes?: string;
}
