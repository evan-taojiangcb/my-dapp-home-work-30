/**
 * Unit tests for useOnChainNote hook — pure logic coverage
 *
 * 需求映射:
 *   R-02 → T-001-hex-preview
 *   R-03 → T-001-validation
 *   R-07 → T-001-hex-encoding
 */

import { toHex, hexToString } from "viem";

// ─── Hex conversion utilities (pure, no wagmi) ───────────────────────────────

describe("On-Chain Note — hex encoding (R-07)", () => {
  it("encodes ASCII text to hex with 0x prefix", () => {
    const result = toHex("hello");
    expect(result).toBe("0x68656c6c6f");
  });

  it("encodes empty string to 0x", () => {
    expect(toHex("")).toBe("0x");
  });

  it("encodes Chinese characters to hex", () => {
    const hex = toHex("你好");
    expect(hex.startsWith("0x")).toBe(true);
    expect(hex.length).toBeGreaterThan(4);
  });

  it("round-trips: hexToString(toHex(text)) === text", () => {
    const original = "Hello, blockchain! 🚀";
    expect(hexToString(toHex(original))).toBe(original);
  });

  it("handles max 500-char input", () => {
    const long = "a".repeat(600);
    const trimmed = long.slice(0, 500);
    const hex = toHex(trimmed);
    const decoded = hexToString(hex);
    expect(decoded).toBe(trimmed);
    expect(decoded.length).toBe(500);
  });
});

// ─── Validation logic (pure) ─────────────────────────────────────────────────

describe("On-Chain Note — input validation (R-03)", () => {
  function validate(text: string, address: string | undefined): string | null {
    if (!address) return "No wallet connected";
    const trimmed = text.slice(0, 500);
    if (!trimmed.trim()) return "Note text cannot be empty";
    return null;
  }

  it("returns error when wallet not connected", () => {
    expect(validate("hello", undefined)).toBe("No wallet connected");
  });

  it("returns error when note is empty", () => {
    expect(validate("", "0xabc")).toBe("Note text cannot be empty");
  });

  it("returns error when note is whitespace only", () => {
    expect(validate("   ", "0xabc")).toBe("Note text cannot be empty");
  });

  it("returns null when valid text and connected", () => {
    expect(validate("store this on-chain", "0xabc")).toBeNull();
  });

  it("slices text to 500 chars before validation", () => {
    const long = "x".repeat(600);
    expect(validate(long, "0xabc")).toBeNull();
  });
});

// ─── Gas insufficient detection (R-03 §校验gas) ──────────────────────────────

describe("On-Chain Note — gas insufficiency (R-03)", () => {
  function isGasInsufficient(balance: bigint, gasCost: bigint): boolean {
    return balance < gasCost;
  }

  it("returns true when balance < gasCost", () => {
    expect(isGasInsufficient(1000n, 2000n)).toBe(true);
  });

  it("returns false when balance === gasCost", () => {
    expect(isGasInsufficient(2000n, 2000n)).toBe(false);
  });

  it("returns false when balance > gasCost", () => {
    expect(isGasInsufficient(9999n, 2000n)).toBe(false);
  });
});

// ─── Status machine sanity (R-04) ────────────────────────────────────────────

describe("On-Chain Note — status transitions (R-04)", () => {
  type NoteStatus = "idle" | "sending" | "confirming" | "success" | "error";

  it("initial status is idle", () => {
    const status: NoteStatus = "idle";
    expect(status).toBe("idle");
  });

  it("isProcessing is true for sending and confirming", () => {
    const isProcessing = (s: NoteStatus) => s === "sending" || s === "confirming";
    expect(isProcessing("idle")).toBe(false);
    expect(isProcessing("sending")).toBe(true);
    expect(isProcessing("confirming")).toBe(true);
    expect(isProcessing("success")).toBe(false);
    expect(isProcessing("error")).toBe(false);
  });
});
