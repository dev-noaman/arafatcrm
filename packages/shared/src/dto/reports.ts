import { DealLocation, ClientSource } from "../enums";

// Shape matches spec §6.4 exactly — do not add fields without updating the spec.
export interface WinLossReportDto {
  won: number;
  lost: number;
  revenueQar: string;   // sum of WON deals' expected_value, 2dp as string
}

// Shape per spec §6.4: "Bar-chart data."
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
