// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RedPacketByToken is ReentrancyGuard {
    using SafeERC20 for IERC20;

 // ─────────────────────────────────────────────────────────────
    // Data structures
    // ─────────────────────────────────────────────────────────────

    struct RedPacket {
        address creator;
        address token;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint32 totalCount;
        uint32 claimedCount;
        bool isRandom;
        uint256 expiry; // block.timestamp + 86400
        bool refunded;
    }

    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    uint256 public nextPacketId = 1;

    /// @dev packetId → RedPacket
    mapping(uint256 => RedPacket) public packets;

    /// @dev packetId → claimer → has claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    /// @dev packetId → claimer → claimed amount
    mapping(uint256 => mapping(address => uint256)) public claimedAmounts;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event RedPacketCreated(
        uint256 indexed packetId,
        address indexed creator,
        address token,
        uint256 totalAmount,
        uint32 count,
        bool isRandom,
        uint256 expiry
    );

    event RedPacketClaimed(
        uint256 indexed packetId,
        address indexed claimer,
        uint256 amount
    );

    event RedPacketRefunded(
        uint256 indexed packetId,
        address indexed creator,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────
    // External functions
    // ─────────────────────────────────────────────────────────────

    /// @notice Create a new red packet by locking ERC-20 tokens.
    /// @param token       ERC-20 token address (e.g. USDC on Sepolia)
    /// @param totalAmount Total token amount to lock (with token decimals)
    /// @param count       Number of shares (1–100)
    /// @param isRandom    If true, distribute pseudo-randomly; otherwise equally
    /// @return packetId   The ID of the newly created packet
    function create(
        address token,
        uint256 totalAmount,
        uint32 count,
        bool isRandom
    ) external returns (uint256 packetId) {
        require(token != address(0), "USDCRedPacket: invalid token");
        require(count >= 1 && count <= 100, "USDCRedPacket: count must be 1-100");
        require(totalAmount >= count, "USDCRedPacket: amount too small");

        packetId = nextPacketId++;

        uint256 expiry = block.timestamp + 86400; // 24 hours

        packets[packetId] = RedPacket({
            creator: msg.sender,
            token: token,
            totalAmount: totalAmount,
            remainingAmount: totalAmount,
            totalCount: count,
            claimedCount: 0,
            isRandom: isRandom,
            expiry: expiry,
            refunded: false
        });

        // Transfer tokens from creator to this contract; caller must have approved first
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        emit RedPacketCreated(packetId, msg.sender, token, totalAmount, count, isRandom, expiry);
    }

    /// @notice Claim one share from a red packet.
    /// @param packetId  ID of the red packet
    function claim(uint256 packetId) external nonReentrant {
        RedPacket storage packet = packets[packetId];

        require(packet.creator != address(0), "USDCRedPacket: packet not found");
        require(!hasClaimed[packetId][msg.sender], "USDCRedPacket: already claimed");
        require(packet.claimedCount < packet.totalCount, "USDCRedPacket: all claimed");
        require(block.timestamp < packet.expiry, "USDCRedPacket: expired");
        require(!packet.refunded, "USDCRedPacket: already refunded");

        uint256 amount;
        uint32 remaining = packet.totalCount - packet.claimedCount;

        if (packet.isRandom) {
            if (remaining == 1) {
                // Last recipient gets everything left
                amount = packet.remainingAmount;
            } else {
                // Pseudo-random: pick a value in [1, remainingAmount - (remaining-1)]
                // so that each future recipient can get at least 1 wei.
                // ⚠️ Demonstration only – use Chainlink VRF in production.
                uint256 maxAmount = packet.remainingAmount - (remaining - 1);
                uint256 rand = uint256(
                    keccak256(
                        abi.encodePacked(
                            block.prevrandao,
                            block.timestamp,
                            msg.sender,
                            packetId,
                            packet.claimedCount
                        )
                    )
                );
                amount = (rand % maxAmount) + 1;
            }
        } else {
            // Equal distribution; last recipient gets the remainder (handles rounding)
            if (remaining == 1) {
                amount = packet.remainingAmount;
            } else {
                amount = packet.totalAmount / packet.totalCount;
            }
        }

        require(amount > 0, "USDCRedPacket: zero amount");

        // Checks-effects-interactions
        hasClaimed[packetId][msg.sender] = true;
        claimedAmounts[packetId][msg.sender] = amount;
        packet.claimedCount += 1;
        packet.remainingAmount -= amount;

        IERC20(packet.token).safeTransfer(msg.sender, amount);

        emit RedPacketClaimed(packetId, msg.sender, amount);
    }

    /// @notice Refund unclaimed tokens to the creator after the red packet expires.
    /// @param packetId  ID of the red packet
    function refund(uint256 packetId) external nonReentrant {
        RedPacket storage packet = packets[packetId];

        require(packet.creator != address(0), "USDCRedPacket: packet not found");
        require(msg.sender == packet.creator, "USDCRedPacket: not creator");
        require(block.timestamp >= packet.expiry, "USDCRedPacket: not expired yet");
        require(!packet.refunded, "USDCRedPacket: already refunded");
        require(packet.remainingAmount > 0, "USDCRedPacket: nothing to refund");

        uint256 amount = packet.remainingAmount;

        // Checks-effects-interactions
        packet.refunded = true;
        packet.remainingAmount = 0;

        IERC20(packet.token).safeTransfer(packet.creator, amount);

        emit RedPacketRefunded(packetId, packet.creator, amount);
    }

    /// @notice Read the full state of a red packet.
    /// @param packetId  ID of the red packet
    function getPacket(uint256 packetId)
        external
        view
        returns (
            address creator,
            address token,
            uint256 totalAmount,
            uint256 remainingAmount,
            uint32 totalCount,
            uint32 claimedCount,
            bool isRandom,
            uint256 expiry,
            bool refunded
        )
    {
        RedPacket storage p = packets[packetId];
        return (
            p.creator,
            p.token,
            p.totalAmount,
            p.remainingAmount,
            p.totalCount,
            p.claimedCount,
            p.isRandom,
            p.expiry,
            p.refunded
        );
    }
}