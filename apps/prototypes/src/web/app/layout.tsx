import type { ReactNode } from "react";
import { LoggerHost } from "../components/LoggerHost.tsx";

export const metadata = { title: "Bloodtower prototypes" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#111",
        }}
      >
        <LoggerHost>{children}</LoggerHost>
      </body>
    </html>
  );
}
