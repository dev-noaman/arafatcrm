import { OfficerndMembershipType } from "@arafat/shared";

export function classifyMembershipType(name: string | null): OfficerndMembershipType {
  if (!name) return OfficerndMembershipType.OTHERS;
  const lower = name.toLowerCase().trim();
  if (!lower) return OfficerndMembershipType.OTHERS;

  if (lower.includes("virtual"))
    return OfficerndMembershipType.VIRTUAL_OFFICE;

  if (/\btl\b/.test(lower) || lower.includes("trade") || lower.includes("license"))
    return OfficerndMembershipType.TRADE_LICENSE;

  if (["flex", "cowork", "hot desk", "dedicated"].some((k) => lower.includes(k)))
    return OfficerndMembershipType.COWORKING;

  if (lower.includes("office"))
    return OfficerndMembershipType.OFFICE;

  return OfficerndMembershipType.OTHERS;
}
