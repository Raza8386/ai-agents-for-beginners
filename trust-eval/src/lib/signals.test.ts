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

  it("returns no packs for neutral text", () => {
    expect(detectPacks("Write a haiku about autumn", "Leaves drift on the pond.")).toEqual([]);
  });
});
