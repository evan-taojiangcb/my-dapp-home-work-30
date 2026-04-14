// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// MessageBoardModule#MessageBoard - 0x20CD59B47e1D1a6e8f86Ce57dDEDfdEd9c7566F8

contract MessageBoard {
    event MessageWritten(
        address indexed author,
        string title,
        string content,
        uint256 createdAt 
    );

    function writeMessage(
        string calldata title,
        string calldata content
    ) external {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(content).length > 0, "Content cannot be empty");
        emit MessageWritten(msg.sender, title, content, block.timestamp);
    }
}