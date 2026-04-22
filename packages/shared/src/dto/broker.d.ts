export interface BrokerDto {
    id: string;
    name: string;
    phone: string;
    company: string | null;
    contractFrom: string;
    contractTo: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CreateBrokerDto {
    name: string;
    phone: string;
    company?: string | null;
    contractFrom: string;
    contractTo: string;
}
export type UpdateBrokerDto = Partial<CreateBrokerDto>;
