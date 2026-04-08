
我需要链接 solana 钱包 phantom，我需要你显示：钱包，网络，地址，币种余额等信息，  下面是一些技术信息


🚀 二、推荐你用：Wallet Adapter（生产级）

下面是你要做的完整步骤👇

⸻

1️⃣ 安装依赖

npm install @solana/web3.js
npm install @solana/wallet-adapter-react
npm install @solana/wallet-adapter-react-ui
npm install @solana/wallet-adapter-wallets


⸻

2️⃣ 初始化钱包 Provider

👉 在 _app.tsx 或 layout 里

"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";

const wallets = [new PhantomWalletAdapter()];

export default function Providers({ children }) {
  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}


⸻

3️⃣ 钱包连接按钮

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function ConnectButton() {
  return <WalletMultiButton />;
}

👉 这个按钮会自动：
	•	检测 Phantom
	•	弹出钱包选择
	•	处理连接

⸻

4️⃣ 获取钱包地址

import { useWallet } from "@solana/wallet-adapter-react";

const { publicKey, connected } = useWallet();

console.log(publicKey?.toBase58());


⸻

5️⃣ 签名（Sign Message）

const { signMessage } = useWallet();

const message = new TextEncoder().encode("hello");
const signature = await signMessage(message);


⸻

6️⃣ 发交易（核心）

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

const { connection } = useConnection();
const { publicKey, sendTransaction } = useWallet();

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: new PublicKey("目标地址"),
    lamports: 1000000,
  })
);

const signature = await sendTransaction(transaction, connection);


