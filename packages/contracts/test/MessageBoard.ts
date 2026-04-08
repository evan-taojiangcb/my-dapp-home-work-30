import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("MessageBoard", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [author] = await viem.getWalletClients();

  it("should emit the MessageWritten event when calling writeMessage()", async function () {
    const contract = await viem.deployContract("MessageBoard");
    const [authorAddress] = await author.getAddresses();

    const title = "aaaa";
    const content = "bbbb";

    const txHash = await contract.write.writeMessage([title, content]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

    const events = await publicClient.getContractEvents({
      address: contract.address,
      abi: contract.abi,
      eventName: "MessageWritten",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
      strict: true,
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].args.author, authorAddress);
    assert.equal(events[0].args.title, title);
    assert.equal(events[0].args.content, content);
    assert.equal(events[0].args.createdAt, block.timestamp);
  });
});
