"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Currency = exports.DealSpaceType = exports.DealLocation = exports.PIPELINE_STAGES = exports.TERMINAL_STAGES = exports.DealStage = exports.DealStatus = exports.ClientSource = exports.Role = void 0;
exports.Role = {
    ADMIN: "ADMIN",
    SALES: "SALES",
};
exports.ClientSource = {
    FACEBOOK: "FACEBOOK",
    INSTAGRAM: "INSTAGRAM",
    TIKTOK: "TIKTOK",
    BROKER: "BROKER",
    GOOGLE: "GOOGLE",
};
exports.DealStatus = {
    ACTIVE: "active",
    WON: "won",
    LOST: "lost",
};
exports.DealStage = {
    LEAD: "lead",
    NEW: "NEW",
    QUALIFIED: "QUALIFIED",
    MEETING: "MEETING",
    PROPOSAL: "PROPOSAL",
    NEGOTIATION: "NEGOTIATION",
    CONTRACT: "CONTRACT",
    WON: "WON",
    LOST: "LOST",
};
exports.TERMINAL_STAGES = [exports.DealStage.WON, exports.DealStage.LOST];
exports.PIPELINE_STAGES = [
    exports.DealStage.LEAD,
    exports.DealStage.NEW,
    exports.DealStage.QUALIFIED,
    exports.DealStage.MEETING,
    exports.DealStage.PROPOSAL,
    exports.DealStage.NEGOTIATION,
    exports.DealStage.CONTRACT,
];
exports.DealLocation = {
    BARWA_ALSADD: "BARWA_ALSADD",
    ELEMENT_WESTBAY: "ELEMENT_WESTBAY",
    MARINA50_LUSAIL: "MARINA50_LUSAIL",
};
exports.DealSpaceType = {
    WORKSTATION: "WORKSTATION",
    OFFICE: "OFFICE",
};
exports.Currency = { QAR: "QAR" };
//# sourceMappingURL=enums.js.map