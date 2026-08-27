import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sonora — digital piano",
  description: "A warm, focused virtual piano for finding your sound.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
