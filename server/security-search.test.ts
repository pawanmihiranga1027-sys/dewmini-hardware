import { describe, expect, it } from "vitest";
import { fuzzyProductScore, generateTotpSecret, verifyTotpCode } from "./db";

describe("smart catalog search", () => {
  it("ranks a spelling mistake close to the intended product", () => {
    const drill = { name: "Cordless Drill 21V", nameSi: "කෝඩ්ලස් ඩ්‍රිල් 21V", category: "Power tools", description: "Reliable drill kit", } as any;
    const paint = { name: "Exterior Wall Paint 1L", nameSi: "බාහිර බිත්ති තීන්ත 1L", category: "Paint", description: "Weather protection", } as any;
    expect(fuzzyProductScore("dril", drill)).toBeGreaterThan(fuzzyProductScore("dril", paint));
    expect(fuzzyProductScore("dril", drill)).toBeGreaterThan(0.55);
  });
});

describe("authenticator TOTP", () => {
  it("accepts the RFC 6238 SHA-1 test vector with one time-step of clock tolerance", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(verifyTotpCode(secret, "287082", 59_000)).toBe(true);
    expect(verifyTotpCode(secret, "000000", 59_000)).toBe(false);
  });

  it("generates a standards-shaped Base32 secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });
});
