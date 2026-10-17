import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../components/board/board.css";
import { boardFonts } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloodtower",
  description: "Story board. Display only. Tower connection is not open in this build.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={boardFonts.variables}>
      <body>{children}</body>
    </html>
  );
}
