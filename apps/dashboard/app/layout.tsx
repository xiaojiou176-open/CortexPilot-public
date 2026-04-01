import type { CSSProperties, ReactNode } from "react";
import DashboardShellChrome from "../components/DashboardShellChrome";
import WebVitalsBridge from "../components/WebVitalsBridge";
import "./globals.css";

export const metadata = {
  title: "CortexPilot | Command Tower for Codex and Claude Code workflows",
  description:
    "Operate Codex and Claude Code workflows through one command tower with Workflow Cases, MCP-readable proof and replay, public first-run cases, and one governed operator path.",
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
