import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Investment Simulation - Why Investing Works",
  description: "Interactive visualization showing how ETF investing works",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
