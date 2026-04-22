import { DealLocation, ClientSource } from "../enums";
export interface WinLossReportDto {
    won: number;
    lost: number;
    revenueQar: string;
}
export interface ByLocationReportDto {
    location: DealLocation;
    won: number;
    lost: number;
}
export interface BySourceReportDto {
    source: ClientSource;
    won: number;
    lost: number;
}
export interface RevenueTimeseriesPointDto {
    bucket: string;
    revenueQar: string;
    wonCount: number;
}
