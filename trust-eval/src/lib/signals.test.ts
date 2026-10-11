import { describe, expect, it } from "vitest";
import { detectPacks } from "./signals";

describe("detectPacks", () => {
  it("triggers the security pack for a firewall prompt", () => {
    expect(detectPacks("firewall policy", "Deny inbound by default.")).toEqual(["security"]);
  });

  it("triggers several packs in catalogue order", () => {
    expect(detectPacks("Is it legal to share customer data under GDPR?", "```sql\nSELECT * FROM users\n```")).toEqual([
      "privacy",
      "code",
    ]);
  });

  it("triggers the NCA pack when NCA is named, together with the security pack", () => {
    expect(detectPacks("Map our controls to NCA ECC-2", "Start with domain 1.")).toEqual(["security", "nca"]);
  });

  it("triggers the NCA pack for security content in a Saudi context", () => {
    expect(detectPacks("Firewall policy for our Riyadh data centre", "Default deny.")).toEqual(["security", "nca"]);
  });

  it("does not trigger the NCA pack for a Saudi context without security content", () => {
    expect(detectPacks("Plan a trip to Jeddah", "Visit the old town.")).toEqual([]);
  });

  it("triggers the SAMA pack when SAMA is named", () => {
    expect(detectPacks("What does the SAMA Cyber Security Framework require?", "Four domains.")).toEqual([
      "security",
      "nca",
      "sama",
    ]);
  });

  it("triggers the SAMA pack for security content at a Saudi financial institution", () => {
    expect(detectPacks("Access reviews for a Saudi bank", "Review privileged access quarterly with MFA.")).toEqual([
      "security",
      "nca",
      "sama",
    ]);
  });

  it("does not trigger the SAMA pack for a Saudi bank question without security content", () => {
    expect(detectPacks("Opening hours of a Saudi bank", "Usually 9:30 to 4:30.")).toEqual([]);
  });

  it("triggers the PDPL pack when the law or its regulator is named, with the privacy pack", () => {
    expect(detectPacks("Do we need a DPO under the PDPL?", "It depends.")).toEqual(["privacy", "pdpl"]);
  });

  it("triggers the PDPL pack for privacy content in a Saudi context", () => {
    expect(detectPacks("Our Riyadh store wants to share customer data with an agency", "Get consent first.")).toEqual([
      "privacy",
      "pdpl",
    ]);
  });

  it("returns no packs for neutral text", () => {
    expect(detectPacks("Write a haiku about autumn", "Leaves drift on the pond.")).toEqual([]);
  });
});
