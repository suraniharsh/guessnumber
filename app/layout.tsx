import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GUESS",
  description: "2-player number guessing game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
