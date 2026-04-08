import { MessageWritten as MessageWrittenEvent } from "../generated/MessageBoard/MessageBoard";
import { Message } from "../generated/schema";

export function handleMessageWritten(event: MessageWrittenEvent): void {
  let entity = new Message(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.author = event.params.author;
  entity.title = event.params.title;
  entity.content = event.params.content;
  entity.createdAt = event.params.createdAt;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
