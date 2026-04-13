import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Sepolia USDC (Circle official): 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
// For local Hardhat networks we deploy MockERC20 instead.
const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

export default buildModule("USDCRedPacketModule", (m) => {
  // When deploying to a public network (e.g. Sepolia) pass the real USDC address
  // via the `usdcAddress` parameter:
  //   npx hardhat ignition deploy ... --parameters '{"usdcAddress":"0x1c7D..."}'
  //
  // When running locally the module also deploys MockERC20 for convenience.
  const usdcAddress = m.getParameter("usdcAddress", "");

  let mockToken;
  if (!usdcAddress) {
    // Local / Hardhat network: deploy a mock ERC-20 token
    mockToken = m.contract("MockERC20");
  }

  const redPacket = m.contract("USDCRedPacket");

  return { redPacket, ...(mockToken ? { mockToken } : {}) };
});
