import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import WalletDynamicProviders from "@/components/providers-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "my-dapp-home-work-30",
  description: "my-dapp-home-work-30",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WalletDynamicProviders>
          <div className="grid grid-rows-[auto_1fr] h-svh">
            <Header />
            {children}
          </div>
        </WalletDynamicProviders>
      </body>
    </html>
  );
}
