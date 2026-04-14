import {buildModule} from '@nomicfoundation/hardhat-ignition/modules';

const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

export default buildModule("RedPacketByTokenModule", (m) => {
  const usdcAddress = m.getParameter("usdcAddress", "");

  let mockToken;
  if (!usdcAddress) {
    mockToken = m.contract("MockERC20");
  }

  const redPacket = m.contract("RedPacketByToken");

  return { redPacket, ...(mockToken ? { mockToken } : {}) };
});