export const MESSAGE_TITLE_MAX_LENGTH = 80;
export const MESSAGE_CONTENT_MAX_LENGTH = 500;
export const SEPOLIA_TX_BASE_URL = "https://sepolia.etherscan.io/tx/";

export const MESSAGE_BOARD_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_MESSAGE_BOARD_CHAIN_ID,
);

export const MESSAGE_BOARD_ADDRESS =
  process.env.NEXT_PUBLIC_MESSAGE_BOARD_CONTRACT_ADDRESS as `0x${string}`;


  export const MESSAGE_HISTORY_PAGE_SIZE = 20;

  export const MESSAGE_BOARD_GRAPH_ENDPOINT = process.env.NEXT_PUBLIC_MESSAGE_BOARD_GRAPH_ENDPOINT ?? "";


export const THE_GRAPH_API =
  process.env.NEXT_PUBLIC_THE_GRAPH_API ?? "";

export enum MessageBoardWriteStatus {
  IDLE = "idle",
  SIGNING = "signing",
  CONFIRMING = "confirming",
  ERROR = "error",
  SUCCESS = "success",
}
