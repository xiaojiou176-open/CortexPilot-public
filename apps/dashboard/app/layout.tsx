import type { CSSProperties, ReactNode } from "react";
import DashboardShellChrome from "../components/DashboardShellChrome";
import WebVitalsBridge from "../components/WebVitalsBridge";
import "./globals.css";

export const metadata = {
  title: "CortexPilot | The command tower for AI engineering",
  description:
    "Stop babysitting AI coding work. CortexPilot plans, delegates, tracks, resumes, and proves long-running engineering work across Codex and Claude Code with Workflow Cases, read-only MCP truth, and replayable proof.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className="app-body"
        style={
          {
            "--font-manrope": '"Manrope"',
            "--font-space-grotesk": '"Space Grotesk"',
            "--font-jetbrains-mono": '"JetBrains Mono"',
          } as CSSProperties
        }
      >
        <WebVitalsBridge />
        <DashboardShellChrome>{children}</DashboardShellChrome>
      </body>
    </html>
  );
}
