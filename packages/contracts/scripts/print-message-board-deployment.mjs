import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_CHAIN_ID = "11155111";
const DEFAULT_FUTURE_ID = "MessageBoardModule#MessageBoard";

async function main() {
  const chainId = process.argv[2] ?? DEFAULT_CHAIN_ID;
  const futureId = process.argv[3] ?? DEFAULT_FUTURE_ID;

  const deploymentDir = path.resolve(
    import.meta.dirname,
    `../ignition/deployments/chain-${chainId}`,
  );

  const deployedAddressesPath = path.join(
    deploymentDir,
    "deployed_addresses.json",
  );
  const journalPath = path.join(deploymentDir, "journal.jsonl");

  const deployedAddresses = JSON.parse(
    await readFile(deployedAddressesPath, "utf8"),
  );
  const address = deployedAddresses[futureId];

  if (address === undefined) {
    throw new Error(`Deployment address not found for "${futureId}"`);
  }

  const journalLines = (await readFile(journalPath, "utf8"))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const confirmationEntry = journalLines
    .map((line) => JSON.parse(line))
    .find(
      (entry) =>
        entry.type === "TRANSACTION_CONFIRM" && entry.futureId === futureId,
    );

  if (confirmationEntry?.receipt?.blockNumber === undefined) {
    throw new Error(`Deployment receipt not found for "${futureId}"`);
  }

  console.log(`futureId: ${futureId}`);
  console.log(`address: ${address}`);
  console.log(`startBlock: ${confirmationEntry.receipt.blockNumber}`);
  console.log(`txHash: ${confirmationEntry.hash}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
