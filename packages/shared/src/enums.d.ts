export declare const Role: {
    readonly ADMIN: "ADMIN";
    readonly SALES: "SALES";
};
export type Role = (typeof Role)[keyof typeof Role];
export declare const ClientSource: {
    readonly FACEBOOK: "FACEBOOK";
    readonly INSTAGRAM: "INSTAGRAM";
    readonly TIKTOK: "TIKTOK";
    readonly BROKER: "BROKER";
    readonly GOOGLE: "GOOGLE";
};
export type ClientSource = (typeof ClientSource)[keyof typeof ClientSource];
export declare const DealStatus: {
    readonly ACTIVE: "active";
    readonly WON: "won";
    readonly LOST: "lost";
};
export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus];
export declare const DealStage: {
    readonly LEAD: "lead";
    readonly NEW: "NEW";
    readonly QUALIFIED: "QUALIFIED";
    readonly MEETING: "MEETING";
    readonly PROPOSAL: "PROPOSAL";
    readonly NEGOTIATION: "NEGOTIATION";
    readonly CONTRACT: "CONTRACT";
    readonly WON: "WON";
    readonly LOST: "LOST";
};
export type DealStage = (typeof DealStage)[keyof typeof DealStage];
export declare const TERMINAL_STAGES: DealStage[];
export declare const PIPELINE_STAGES: DealStage[];
export declare const DealLocation: {
    readonly BARWA_ALSADD: "BARWA_ALSADD";
    readonly ELEMENT_WESTBAY: "ELEMENT_WESTBAY";
    readonly MARINA50_LUSAIL: "MARINA50_LUSAIL";
};
export type DealLocation = (typeof DealLocation)[keyof typeof DealLocation];
export declare const DealSpaceType: {
    readonly WORKSTATION: "WORKSTATION";
    readonly OFFICE: "OFFICE";
};
export type DealSpaceType = (typeof DealSpaceType)[keyof typeof DealSpaceType];
export declare const Currency: {
    readonly QAR: "QAR";
};
export type Currency = (typeof Currency)[keyof typeof Currency];
