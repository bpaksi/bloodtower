import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { ConnectionHeader } from "@/components/ConnectionHeader";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Dark Tower", template: "%s · Dark Tower" },
  description: "Controller and investigation tool for the Return to Dark Tower tower.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-dvh">
        <ConnectionHeader />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
