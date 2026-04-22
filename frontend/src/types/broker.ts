import type { User } from "./auth";

export type BrokerType = "PERSONAL" | "CORPORATE";
export type BrokerDocumentType = "QID" | "CR" | "TL" | "COMPUTER_CARD" | "OTHERS";

export interface BrokerDocument {
  id: string;
  docType: BrokerDocumentType;
  originalName: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

export interface Broker {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  brokerType: BrokerType;
  contractFrom: string | null;
  contractTo: string | null;
  isActive: boolean;
  notes: string | null;
  managedBy: User | null;
  documents: BrokerDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrokerDto {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  brokerType: BrokerType;
  contractFrom: string;
  contractTo: string;
  notes?: string;
  managedById?: string;
}

export interface UpdateBrokerDto {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  brokerType?: BrokerType;
  contractFrom?: string;
  contractTo?: string;
  isActive?: boolean;
  notes?: string;
}
