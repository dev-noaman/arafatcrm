import { OfficerndMembershipType } from "@arafat/shared";
import { classifyMembershipType } from "./membership-type.classifier";

describe("classifyMembershipType", () => {
  describe("falsy / empty input → OTHERS", () => {
    test.each([null, "", "   "])("%p → OTHERS", (input) => {
      expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.OTHERS);
    });
  });

  describe("VIRTUAL_OFFICE", () => {
    test.each(["Virtual Office", "VIRTUAL OFFICE", "Premium Virtual Plan"])(
      "%p → VIRTUAL_OFFICE",
      (input) => {
        expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.VIRTUAL_OFFICE);
      },
    );
  });

  describe("TRADE_LICENSE", () => {
    test.each(["Trade License", "TL Standard", "License Renewal"])(
      "%p → TRADE_LICENSE",
      (input) => {
        expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.TRADE_LICENSE);
      },
    );
  });

  describe("word-boundary on \\btl\\b", () => {
    test.each(["title insurance", "settler benefits"])(
      "%p must NOT match TL → OTHERS",
      (input) => {
        expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.OTHERS);
      },
    );
  });

  describe("COWORKING", () => {
    test.each(["Flex 5-Day", "Coworking Pass", "Hot Desk", "Dedicated Desk"])(
      "%p → COWORKING",
      (input) => {
        expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.COWORKING);
      },
    );
  });

  describe("OFFICE", () => {
    test.each(["Closed Office", "Office Premium"])("%p → OFFICE", (input) => {
      expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.OFFICE);
    });
  });

  test("Flex Office → COWORKING (precedence over OFFICE)", () => {
    expect(classifyMembershipType("Flex Office")).toBe(OfficerndMembershipType.COWORKING);
  });

  test("Misc plan → OTHERS", () => {
    expect(classifyMembershipType("Misc plan")).toBe(OfficerndMembershipType.OTHERS);
  });
});
