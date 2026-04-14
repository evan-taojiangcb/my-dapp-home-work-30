import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { network } from "hardhat";
import { parseUnits } from "viem";

// USDC uses 6 decimals; helper to convert human-readable amounts
const usdc = (amount: number) => parseUnits(amount.toString(), 6);

describe("RedPacketByToken", async function () {
  const connection = await network.connect();
  const { viem, provider } = connection;
  const publicClient = await viem.getPublicClient();
  const [creator, alice, bob, carol] = await viem.getWalletClients();
  const [creatorAddr, aliceAddr, bobAddr, carolAddr] = await Promise.all([
    creator.getAddresses().then((a) => a[0]),
    alice.getAddresses().then((a) => a[0]),
    bob.getAddresses().then((a) => a[0]),
    carol.getAddresses().then((a) => a[0]),
  ]);

  let token: Awaited<ReturnType<typeof viem.deployContract>>;
  let redPacket: Awaited<ReturnType<typeof viem.deployContract>>;

  before(async () => {
    token = await viem.deployContract("MockERC20");
    redPacket = await viem.deployContract("RedPacketByToken");

    // Mint USDC to creator (100 USDC)
    await token.write.mint([creatorAddr, usdc(100)], { account: creator.account });
  });

  // ─── Equal distribution ────────────────────────────────────────

  describe("equal distribution", () => {
    it("full lifecycle: create → 3 claims → correct amounts", async () => {
      const total = usdc(30); // 30 USDC split into 3 equal shares

      // Approve & create
      await token.write.approve([redPacket.address, total], { account: creator.account });
      const createTx = await redPacket.write.create(
        [token.address, total, 3, false],
        { account: creator.account },
      );
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });

      const createEvents = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketCreated",
        fromBlock: createReceipt.blockNumber,
        toBlock: createReceipt.blockNumber,
        strict: true,
      });
      assert.equal(createEvents.length, 1);
      const packetId = createEvents[0].args.packetId as bigint;
      assert.ok(packetId >= 1n);

      // Claim #1 – alice
      await token.write.mint([aliceAddr, 0n]); // ensure wallet exists in type system
      const claimTx1 = await redPacket.write.claim([packetId], { account: alice.account });
      const claimReceipt1 = await publicClient.waitForTransactionReceipt({ hash: claimTx1 });
      const claimEvents1 = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketClaimed",
        fromBlock: claimReceipt1.blockNumber,
        toBlock: claimReceipt1.blockNumber,
        strict: true,
      });
      assert.equal(claimEvents1[0].args.amount, usdc(10));

      // Claim #2 – bob
      const claimTx2 = await redPacket.write.claim([packetId], { account: bob.account });
      const claimReceipt2 = await publicClient.waitForTransactionReceipt({ hash: claimTx2 });
      const claimEvents2 = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketClaimed",
        fromBlock: claimReceipt2.blockNumber,
        toBlock: claimReceipt2.blockNumber,
        strict: true,
      });
      assert.equal(claimEvents2[0].args.amount, usdc(10));

      // Claim #3 – carol (last one gets remainder)
      const claimTx3 = await redPacket.write.claim([packetId], { account: carol.account });
      const claimReceipt3 = await publicClient.waitForTransactionReceipt({ hash: claimTx3 });
      const claimEvents3 = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketClaimed",
        fromBlock: claimReceipt3.blockNumber,
        toBlock: claimReceipt3.blockNumber,
        strict: true,
      });
      assert.equal(claimEvents3[0].args.amount, usdc(10));

      // Verify packet is fully claimed
      const p = await redPacket.read.getPacket([packetId]);
      assert.equal(p[4], 3); // claimedCount == totalCount
      assert.equal(p[3], 0n); // remainingAmount == 0
    });
  });

  // ─── Random distribution ───────────────────────────────────────

  describe("random distribution", () => {
    it("total amount is conserved after all claims", async () => {
      const total = usdc(6); // 6 USDC, 3 recipients

      // Mint more to creator for this test
      await token.write.mint([creatorAddr, total], { account: creator.account });
      await token.write.approve([redPacket.address, total], { account: creator.account });

      const createTx = await redPacket.write.create(
        [token.address, total, 3, true],
        { account: creator.account },
      );
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
      const createEvents = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketCreated",
        fromBlock: createReceipt.blockNumber,
        toBlock: createReceipt.blockNumber,
        strict: true,
      });
      const packetId = createEvents[0].args.packetId as bigint;

      // Three different accounts claim
      let totalClaimed = 0n;
      for (const claimer of [alice, bob, carol]) {
        const tx = await redPacket.write.claim([packetId], { account: claimer.account });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        const events = await publicClient.getContractEvents({
          address: redPacket.address,
          abi: redPacket.abi,
          eventName: "RedPacketClaimed",
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber,
          strict: true,
        });
        const amount = events[0].args.amount as bigint;
        assert.ok(amount > 0n, "claimed amount must be > 0");
        totalClaimed += amount;
      }

      assert.equal(totalClaimed, total, "total claimed must equal total deposited");

      const p = await redPacket.read.getPacket([packetId]);
      assert.equal(p[3], 0n); // remainingAmount == 0
    });
  });

  // ─── Duplicate claim ───────────────────────────────────────────

  describe("duplicate claim prevention", () => {
    it("should revert on second claim from same address", async () => {
      const total = usdc(10);
      await token.write.mint([creatorAddr, total], { account: creator.account });
      await token.write.approve([redPacket.address, total], { account: creator.account });

      const createTx = await redPacket.write.create(
        [token.address, total, 2, false],
        { account: creator.account },
      );
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
      const createEvents = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketCreated",
        fromBlock: createReceipt.blockNumber,
        toBlock: createReceipt.blockNumber,
        strict: true,
      });
      const packetId = createEvents[0].args.packetId as bigint;

      // First claim OK
      await redPacket.write.claim([packetId], { account: alice.account });

      // Second claim from same address should revert
      await assert.rejects(
        () => redPacket.write.claim([packetId], { account: alice.account }),
        /already claimed/,
      );
    });
  });

  // ─── Refund ────────────────────────────────────────────────────

  describe("refund", () => {
    it("should revert when called before expiry", async () => {
      const total = usdc(5);
      await token.write.mint([creatorAddr, total], { account: creator.account });
      await token.write.approve([redPacket.address, total], { account: creator.account });

      const createTx = await redPacket.write.create(
        [token.address, total, 2, false],
        { account: creator.account },
      );
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
      const createEvents = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketCreated",
        fromBlock: createReceipt.blockNumber,
        toBlock: createReceipt.blockNumber,
        strict: true,
      });
      const packetId = createEvents[0].args.packetId as bigint;

      await assert.rejects(
        () => redPacket.write.refund([packetId], { account: creator.account }),
        /not expired yet/,
      );
    });

    it("should succeed after expiry and return remaining balance", async () => {
      const total = usdc(10);
      await token.write.mint([creatorAddr, total], { account: creator.account });
      await token.write.approve([redPacket.address, total], { account: creator.account });

      const createTx = await redPacket.write.create(
        [token.address, total, 3, false],
        { account: creator.account },
      );
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
      const createEvents = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketCreated",
        fromBlock: createReceipt.blockNumber,
        toBlock: createReceipt.blockNumber,
        strict: true,
      });
      const packetId = createEvents[0].args.packetId as bigint;

      // 1 person claims so remainder is 2/3 of total (equal distribution)
      await redPacket.write.claim([packetId], { account: alice.account });

      // Time-travel past expiry using Hardhat network helper
      await provider.request({
        method: "evm_increaseTime",
        params: [86401],
      });
      await provider.request({ method: "evm_mine", params: [] });

      const balanceBefore = await token.read.balanceOf([creatorAddr]);
      const refundTx = await redPacket.write.refund([packetId], { account: creator.account });
      const refundReceipt = await publicClient.waitForTransactionReceipt({ hash: refundTx });
      const balanceAfter = await token.read.balanceOf([creatorAddr]);

      const refundEvents = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketRefunded",
        fromBlock: refundReceipt.blockNumber,
        toBlock: refundReceipt.blockNumber,
        strict: true,
      });
      assert.equal(refundEvents.length, 1);
      const refundedAmount = refundEvents[0].args.amount as bigint;
      assert.ok(refundedAmount > 0n, "refunded amount must be > 0");
      assert.equal(balanceAfter - balanceBefore, refundedAmount);
    });

    it("should revert when non-creator tries to refund", async () => {
      const total = usdc(5);
      await token.write.mint([creatorAddr, total], { account: creator.account });
      await token.write.approve([redPacket.address, total], { account: creator.account });

      const createTx = await redPacket.write.create(
        [token.address, total, 2, false],
        { account: creator.account },
      );
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
      const createEvents = await publicClient.getContractEvents({
        address: redPacket.address,
        abi: redPacket.abi,
        eventName: "RedPacketCreated",
        fromBlock: createReceipt.blockNumber,
        toBlock: createReceipt.blockNumber,
        strict: true,
      });
      const packetId = createEvents[0].args.packetId as bigint;

      // Time-travel past expiry
      await provider.request({
        method: "evm_increaseTime",
        params: [86401],
      });
      await provider.request({ method: "evm_mine", params: [] });

      await assert.rejects(
        () => redPacket.write.refund([packetId], { account: alice.account }),
        /not creator/,
      );
    });
  });
});
