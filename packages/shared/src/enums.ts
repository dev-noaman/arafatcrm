export const Role = {
  ADMIN: "ADMIN",
  SALES: "SALES",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ClientSource = {
  MZAD_QATAR: "MZAD_QATAR",
  FACEBOOK: "FACEBOOK",
  GOOGLE: "GOOGLE",
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  YOUTUBE: "YOUTUBE",
  PROPERTY_FINDER: "PROPERTY_FINDER",
  MAZAD_ARAB: "MAZAD_ARAB",
  REFERRAL: "REFERRAL",
  WEBSITE: "WEBSITE",
  OFFICERND_RENEWAL: "OFFICERND_RENEWAL",
} as const;
export type ClientSource = (typeof ClientSource)[keyof typeof ClientSource];

export const DealStatus = {
  ACTIVE: "active",
  WON: "won",
  LOST: "lost",
} as const;
export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus];

export const DealStage = {
  LEAD: "lead",
  NEW: "NEW",
  QUALIFIED: "QUALIFIED",
  MEETING: "MEETING",
  PROPOSAL: "PROPOSAL",
  NEGOTIATION: "NEGOTIATION",
  CONTRACT: "CONTRACT",
  WON: "WON",
  LOST: "LOST",
} as const;
export type DealStage = (typeof DealStage)[keyof typeof DealStage];

export const TERMINAL_STAGES: DealStage[] = [DealStage.WON, DealStage.LOST];

export const PIPELINE_STAGES: DealStage[] = [
  DealStage.NEW,
  DealStage.QUALIFIED,
  DealStage.MEETING,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.CONTRACT,
  DealStage.WON,
  DealStage.LOST,
];

export const DealLocation = {
  BARWA_ALSADD: "BARWA_ALSADD",
  ELEMENT_WESTBAY: "ELEMENT_WESTBAY",
  MARINA50_LUSAIL: "MARINA50_LUSAIL",
} as const;
export type DealLocation = (typeof DealLocation)[keyof typeof DealLocation];

export const DealSpaceType = {
  CLOSED_OFFICE: "CLOSED_OFFICE",
  ABC_ADDRESS: "ABC_ADDRESS",
  ABC_FLEX: "ABC_FLEX",
  ABC_ELITE: "ABC_ELITE",
} as const;
export type DealSpaceType =
  (typeof DealSpaceType)[keyof typeof DealSpaceType];

export const Currency = { QAR: "QAR" } as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const BrokerType = {
  PERSONAL: "PERSONAL",
  CORPORATE: "CORPORATE",
} as const;
export type BrokerType = (typeof BrokerType)[keyof typeof BrokerType];

export const BrokerDocumentType = {
  QID: "QID",
  CR: "CR",
  TL: "TL",
  COMPUTER_CARD: "COMPUTER_CARD",
  OTHERS: "OTHERS",
} as const;
export type BrokerDocumentType =
  (typeof BrokerDocumentType)[keyof typeof BrokerDocumentType];

export const OfficerndSyncStatus = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  PIPELINED: "PIPELINED",
  IGNORED: "IGNORED",
} as const;
export type OfficerndSyncStatus = (typeof OfficerndSyncStatus)[keyof typeof OfficerndSyncStatus];
