import { erc20Abi } from "viem";
import { abi as redPacketAbi } from "@my-dapp-home-work-30/contracts/artifacts/contracts/USDCRedPacket.sol/USDCRedPacket.json";

export const SEPOLIA_USDC_ADDRESS =
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`;

export const USDC_DECIMALS = 6;

export const RED_PACKET_CHAIN_ID = 11155111; // Sepolia

/// @dev Update this after deploying USDCRedPacket to Sepolia.
export const RED_PACKET_ADDRESS = (
  process.env.NEXT_PUBLIC_RED_PACKET_CONTRACT_ADDRESS ?? ""
) as `0x${string}`;

export const SEPOLIA_TX_BASE_URL = "https://sepolia.etherscan.io/tx/";

export const RED_PACKET_ABI = redPacketAbi;
export const ERC20_ABI = erc20Abi;

export enum RedPacketStatus {
  IDLE = "idle",
  /** Waiting for the user to sign the USDC approval tx */
  APPROVING = "approving",
  /** Approval tx submitted, waiting for on-chain confirmation */
  APPROVE_CONFIRMING = "approve_confirming",
  /** Waiting for the user to sign the create tx */
  CREATING = "creating",
  /** Create tx submitted, waiting for on-chain confirmation */
  CREATE_CONFIRMING = "create_confirming",
  SUCCESS = "success",
  ERROR = "error",
}

export enum ClaimStatus {
  IDLE = "idle",
  CLAIMING = "claiming",
  CONFIRMING = "confirming",
  SUCCESS = "success",
  ERROR = "error",
}
