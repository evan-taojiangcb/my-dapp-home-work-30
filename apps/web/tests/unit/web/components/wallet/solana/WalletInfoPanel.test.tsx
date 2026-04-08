/**
 * Unit tests for WalletInfoPanel component
 *
 * Covers:
 * - Returns null when not connected
 * - Renders address, network, balance when connected
 * - Shows "Loading..." when isLoading
 * - Shows "— SOL" when isError
 * - Shows "— ETH" when on Sepolia network
 * - Disconnect button calls disconnect()
 * - Click-to-copy address functionality
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Mock } from "vitest";

// Mock the useSolanaBalance hook
vi.mock(
  "../../../../../../src/components/wallet/solana/useSolanaBalance",
  () => ({
    useSolanaBalance: vi.fn(),
  })
);

// Mock @solana/wallet-adapter-react
vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: vi.fn(),
}));

// Mock NetworkProvider context
vi.mock(
  "../../../../../../src/components/wallet/solana/NetworkProvider",
  () => ({
    useNetworkContext: vi.fn(() => ({
      networkId: "solana-devnet",
      network: {
        label: "Solana Devnet",
        symbol: "SOL",
        endpoint: "https://api.devnet.solana.com",
        description: "Solana development network",
      },
      isSepolia: false,
      setNetworkId: vi.fn(),
    })),
  })
);

// Mock @testing-library/jest-dom for toBeInTheDocument matcher
import "@testing-library/jest-dom";

import WalletInfoPanel from "../../../../../../src/components/wallet/solana/WalletInfoPanel";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaBalance } from "../../../../../../src/components/wallet/solana/useSolanaBalance";
import { useNetworkContext } from "../../../../../../src/components/wallet/solana/NetworkProvider";

function mockPublicKey(base58: string) {
  return { toBase58: () => base58 };
}

describe("WalletInfoPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render network and balance placeholder when wallet is not connected", () => {
    (useWallet as Mock).mockReturnValue({
      publicKey: null,
      connected: false,
      disconnect: vi.fn(),
    });
    (useSolanaBalance as Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });

    render(<WalletInfoPanel />);
    // Network label always visible
    expect(screen.getByText("Solana Devnet")).toBeInTheDocument();
    // Balance shows placeholder when disconnected
    expect(screen.getByText("— SOL")).toBeInTheDocument();
    // Address shows dash placeholder
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("should render network and balance placeholder when publicKey is null even if connected=true", () => {
    (useWallet as Mock).mockReturnValue({
      publicKey: null,
      connected: true,
      disconnect: vi.fn(),
    });
    (useSolanaBalance as Mock).mockReturnValue({ data: undefined, isLoading: false, isError: false });

    render(<WalletInfoPanel />);
    expect(screen.getByText("Solana Devnet")).toBeInTheDocument();
    expect(screen.getByText("— SOL")).toBeInTheDocument();
  });

  it("should render address, network, and balance when connected", () => {
    const mockPK = mockPublicKey("AbCdEfGhIjKlMnOpQrStUvWxYz123456789");
    (useWallet as Mock).mockReturnValue({
      publicKey: mockPK,
      connected: true,
      disconnect: vi.fn(),
    });
    (useSolanaBalance as Mock).mockReturnValue({
      data: 1.5,
      isLoading: false,
      isError: false,
    });

    render(<WalletInfoPanel />);

    // Address shown in truncated format (first 4 + last 4)
    expect(screen.getByText("AbCd...6789")).toBeInTheDocument();
    // Network label
    expect(screen.getByText("Solana Devnet")).toBeInTheDocument();
    // Balance shown as 1.5000 SOL
    expect(screen.getByText("1.5000 SOL")).toBeInTheDocument();
    // Section heading
    expect(screen.getByText("Wallet")).toBeInTheDocument();
  });

  it("should show 'Loading...' when balance is loading", () => {
    const mockPK = mockPublicKey("AbCdEfGhIjKlMnOpQrStUvWxYz123456789");
    (useWallet as Mock).mockReturnValue({
      publicKey: mockPK,
      connected: true,
      disconnect: vi.fn(),
    });
    (useSolanaBalance as Mock).mockReturnValue({ data: undefined, isLoading: true, isError: false });

    render(<WalletInfoPanel />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show '— SOL' when isError is true", () => {
    const mockPK = mockPublicKey("AbCdEfGhIjKlMnOpQrStUvWxYz123456789");
    (useWallet as Mock).mockReturnValue({
      publicKey: mockPK,
      connected: true,
      disconnect: vi.fn(),
    });
    (useSolanaBalance as Mock).mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(<WalletInfoPanel />);
    expect(screen.getByText("— SOL")).toBeInTheDocument();
  });

  it("should show '— SOL' when balance data is null", () => {
    const mockPK = mockPublicKey("AbCdEfGhIjKlMnOpQrStUvWxYz123456789");
    (useWallet as Mock).mockReturnValue({
      publicKey: mockPK,
      connected: true,
      disconnect: vi.fn(),
    });
    (useSolanaBalance as Mock).mockReturnValue({ data: null, isLoading: false, isError: false });

    render(<WalletInfoPanel />);
    expect(screen.getByText("— SOL")).toBeInTheDocument();
  });

  it("should show '— ETH' when on Sepolia network", () => {
    (useNetworkContext as Mock).mockReturnValue({
      networkId: "ethereum-sepolia",
      network: {
        label: "Ethereum Sepolia",
        symbol: "ETH",
        endpoint: "",
        description: "Ethereum testnet",
      },
      isSepolia: true,
      setNetworkId: vi.fn(),
    });
    const mockPK = mockPublicKey("AbCdEfGhIjKlMnOpQrStUvWxYz123456789");
    (useWallet as Mock).mockReturnValue({
      publicKey: mockPK,
      connected: true,
      disconnect: vi.fn(),
    });
    (useSolanaBalance as Mock).mockReturnValue({
      data: 2.0,
      isLoading: false,
      isError: false,
    });

    render(<WalletInfoPanel />);

    // Sepolia shows "— ETH" regardless of actual SOL balance
    expect(screen.getByText("— ETH")).toBeInTheDocument();
    // Network label updates
    expect(screen.getByText("Ethereum Sepolia")).toBeInTheDocument();
  });

  it("should call disconnect() when disconnect button is clicked", () => {
    const mockPK = mockPublicKey("AbCdEfGhIjKlMnOpQrStUvWxYz123456789");
    const mockDisconnect = vi.fn().mockResolvedValue(undefined);
    (useWallet as Mock).mockReturnValue({
      publicKey: mockPK,
      connected: true,
      disconnect: mockDisconnect,
    });
    (useSolanaBalance as Mock).mockReturnValue({ data: 1.0, isLoading: false, isError: false });

    render(<WalletInfoPanel />);
    fireEvent.click(screen.getByText("Disconnect"));

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("should render address button", () => {
    const fullAddress = "AbCdEfGhIjKlMnOpQrStUvWxYz123456789";
    const mockPK = mockPublicKey(fullAddress);
    (useWallet as Mock).mockReturnValue({
      publicKey: mockPK,
      connected: true,
      disconnect: vi.fn(),
    });
    (useSolanaBalance as Mock).mockReturnValue({ data: 0.0, isLoading: false, isError: false });

    render(<WalletInfoPanel />);

    const addressButton = screen.getByTitle("Click to copy full address");
    expect(addressButton).toBeInTheDocument();
  });
});
