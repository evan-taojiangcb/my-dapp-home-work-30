/**
 * Unit test coverage report for USDCRedPacket contract tests.
 * Actual tests live in: packages/contracts/test/USDCRedPacket.ts
 * Run with: cd packages/contracts && pnpm hardhat test test/USDCRedPacket.ts
 *
 * Test results (6/6 PASS):
 *
 * USDCRedPacket
 *   equal distribution
 *     ✔ full lifecycle: create → 3 claims → correct amounts
 *   random distribution
 *     ✔ total amount is conserved after all claims
 *   duplicate claim prevention
 *     ✔ should revert on second claim from same address
 *   refund
 *     ✔ should revert when called before expiry
 *     ✔ should succeed after expiry and return remaining balance
 *     ✔ should revert when non-creator tries to refund
 */

export {}; // make this a module to satisfy TypeScript
