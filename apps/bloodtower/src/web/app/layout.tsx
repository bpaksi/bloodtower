import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../components/board/board.css";
import { PageCapture } from "../components/errors/PageCapture.tsx";
import { boardFonts } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blood Tower",
  description: "Blood Tower — open the Story board on the Mac or join as a hunter on iPad.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={boardFonts.variables}>
      <body>
        <PageCapture>{children}</PageCapture>
      </body>
    </html>
  );
}
