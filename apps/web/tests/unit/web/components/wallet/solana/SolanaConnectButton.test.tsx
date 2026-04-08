/**
 * Unit tests for SolanaConnectButton component
 *
 * Covers:
 * - Renders BaseWalletMultiButton with correct labels
 * - Labels object has correct AC-001 / AC-007 keys
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock CSS import to avoid PostCSS processing of wallet-adapter stylesheet
vi.mock("@solana/wallet-adapter-react-ui/styles.css", () => ({}));

// Mock BaseWalletMultiButton
vi.mock("@solana/wallet-adapter-react-ui", () => ({
  BaseWalletMultiButton: vi.fn(({ labels, className }) => (
    <button data-testid="phantom-btn" data-labels={JSON.stringify(labels)} className={className}>
      Phantom Wallet Button
    </button>
  )),
}));

import SolanaConnectButton from "../../../../../../src/components/wallet/solana/SolanaConnectButton";

describe("SolanaConnectButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render BaseWalletMultiButton with className 'wallet-button'", () => {
    render(<SolanaConnectButton />);
    expect(screen.getByTestId("phantom-btn")).toHaveAttribute("class", "wallet-button");
  });

  it("should pass correct labels to BaseWalletMultiButton", () => {
    render(<SolanaConnectButton />);
    const labels = JSON.parse(screen.getByTestId("phantom-btn").getAttribute("data-labels") ?? "{}");

    // AC-001: 'no-wallet' label should be "Connect to Phantom"
    expect(labels["no-wallet"]).toBe("Connect to Phantom");
    // AC-007: 'has-wallet' label should be "Connect" (not overridden — modal handles "Install Phantom")
    expect(labels["has-wallet"]).toBe("Connect");
    // Other labels should be present
    expect(labels["change-wallet"]).toBe("Change wallet");
    expect(labels["connecting"]).toBe("Connecting ...");
    expect(labels["copy-address"]).toBe("Copy address");
    expect(labels["copied"]).toBe("Copied!");
    expect(labels["disconnect"]).toBe("Disconnect");
  });

  it("should not override 'has-wallet' label (modal handles AC-007)", () => {
    render(<SolanaConnectButton />);
    const labels = JSON.parse(screen.getByTestId("phantom-btn").getAttribute("data-labels") ?? "{}");

    // 'has-wallet' should be the default "Connect", not "Install Phantom"
    // AC-007: "Install Phantom" prompt comes from the wallet modal, not button label
    expect(labels["has-wallet"]).toBe("Connect");
    expect(labels["has-wallet"]).not.toBe("Install Phantom");
  });
});
