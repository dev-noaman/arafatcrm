export const Role = {
  ADMIN: "ADMIN",
  SALES: "SALES",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ClientSource = {
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  BROKER: "BROKER",
  GOOGLE: "GOOGLE",
} as const;
export type ClientSource = (typeof ClientSource)[keyof typeof ClientSource];

export const DealStage = {
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
];

export const DealLocation = {
  BARWA_ALSADD: "BARWA_ALSADD",
  ELEMENT_WESTBAY: "ELEMENT_WESTBAY",
  MARINA50_LUSAIL: "MARINA50_LUSAIL",
} as const;
export type DealLocation = (typeof DealLocation)[keyof typeof DealLocation];

export const DealSpaceType = {
  WORKSTATION: "WORKSTATION",
  OFFICE: "OFFICE",
} as const;
export type DealSpaceType =
  (typeof DealSpaceType)[keyof typeof DealSpaceType];

export const Currency = { QAR: "QAR" } as const;
export type Currency = (typeof Currency)[keyof typeof Currency];
