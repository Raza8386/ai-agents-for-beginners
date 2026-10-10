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

  it("returns no packs for neutral text", () => {
    expect(detectPacks("Write a haiku about autumn", "Leaves drift on the pond.")).toEqual([]);
  });
});
