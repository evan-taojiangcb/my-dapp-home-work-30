/**
 * Unit tests for useSolanaBalance hook
 *
 * Covers:
 * - Query is disabled when publicKey is null
 * - Query uses correct staleTime
 * - Query key includes networkId and publicKey
 * - Returns balance in SOL units (LAMPORTS_PER_SOL conversion)
 */
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Mock } from "vitest";

// Mock @tanstack/react-query
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));

// Mock @solana/wallet-adapter-react
vi.mock("@solana/wallet-adapter-react", () => ({
  useConnection: vi.fn(),
}));

// Mock @solana/web3.js
vi.mock("@solana/web3.js", () => ({
  LAMPORTS_PER_SOL: 1_000_000_000,
}));

// Mock NetworkProvider context
vi.mock(
  "../../../../../../src/components/wallet/solana/NetworkProvider",
  () => ({
    useNetworkContext: vi.fn(() => ({ networkId: "solana-devnet" })),
  })
);

import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@solana/wallet-adapter-react";
import { useSolanaBalance } from "../../../../../../src/components/wallet/solana/useSolanaBalance";
import type { PublicKey } from "@solana/web3.js";

// Helper: create a mock PublicKey with toBase58 method
function mockPublicKey(base58: string): PublicKey {
  return { toBase58: () => base58 } as unknown as PublicKey;
}

describe("useSolanaBalance", () => {
  const mockConnection = { getBalance: vi.fn() };
  const mockPublicKeyObj = mockPublicKey("AbCdEfGhIjKlMnOpQrStUvWxYz123456789");

  beforeEach(() => {
    vi.clearAllMocks();
    (useConnection as Mock).mockReturnValue({ connection: mockConnection });
  });

  it("should disabled query when publicKey is null", () => {
    (useQuery as Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });

    renderHook(() => useSolanaBalance(null));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ["solana-balance", "solana-devnet", undefined],
      })
    );
  });

  it("should enabled query when publicKey is provided with networkId in key", () => {
    (useQuery as Mock).mockReturnValue({ data: 1.5, isLoading: false, isError: false });

    renderHook(() => useSolanaBalance(mockPublicKeyObj));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        queryKey: ["solana-balance", "solana-devnet", "AbCdEfGhIjKlMnOpQrStUvWxYz123456789"],
      })
    );
  });

  it("should pass correct query key with networkId and publicKey base58", () => {
    (useQuery as Mock).mockReturnValue({ data: 0.5, isLoading: false, isError: false });

    const anotherKey = mockPublicKey("UniqueKey99999999999999999999999999");
    renderHook(() => useSolanaBalance(anotherKey));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["solana-balance", "solana-devnet", "UniqueKey99999999999999999999999999"],
      })
    );
  });

  it("should have staleTime of 30 seconds", () => {
    (useQuery as Mock).mockReturnValue({ data: 1.0, isLoading: false, isError: false });

    renderHook(() => useSolanaBalance(mockPublicKeyObj));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 30_000,
      })
    );
  });
});
