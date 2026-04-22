import { ClientSource } from "../enums";
export interface ClientDto {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    companyName: string | null;
    source: ClientSource;
    createdAt: string;
    updatedAt: string;
}
export interface CreateClientDto {
    name: string;
    phone: string;
    email?: string | null;
    companyName?: string | null;
    source: ClientSource;
}
export type UpdateClientDto = Partial<CreateClientDto>;
