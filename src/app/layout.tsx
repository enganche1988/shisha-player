import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "The Packer",
    template: "%s | The Packer",
  },
  description:
    "The Packer は、シーシャを『店』ではなく、実際に作っている人で選ぶための紹介メディアです。写真と推薦の言葉だけで静かに伝えます。予約や来店管理は行っていません。気になった人がいればInstagramのDMで本人に直接連絡する設計です。比較もしない。ランキングもしない。ただ、選ばれている人を並べています。",
  openGraph: {
    title: "The Packer",
    description:
      "The Packer は、シーシャを『店』ではなく、実際に作っている人で選ぶための紹介メディアです。写真と推薦の言葉だけで静かに伝えます。予約や来店管理は行っていません。気になった人がいればInstagramのDMで本人に直接連絡する設計です。比較もしない。ランキングもしない。ただ、選ばれている人を並べています。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
