import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import AppNav from "../components/AppNav";
import WebVitalsBridge from "../components/WebVitalsBridge";
import { Badge } from "../components/ui/badge";
import "./globals.css";

export const metadata = {
  title: "CortexPilot Command Tower",
  description: "AI Agent Governance Control Plane",
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
        <a className="skip-link" href="#dashboard-content">
          Skip to dashboard content
        </a>
        <WebVitalsBridge />
        <div className="app-shell">
          <aside className="sidebar" aria-label="Primary navigation">
            <div className="sidebar-brand">
              <Link href="/" className="brand-link">
                CortexPilot Command Tower
              </Link>
              <p className="sidebar-subtitle">AI agent governance control plane</p>
            </div>
            <AppNav />
          </aside>

          <div className="app-main">
            <header className="topbar" role="banner">
              <p className="topbar-title">Operations console</p>
              <div className="home-section-health" role="group" aria-label="Platform status overview">
                <Badge>Governance view</Badge>
                <Badge>Live verification required</Badge>
                <Badge>Page-level status</Badge>
              </div>
            </header>
            <div className="content" id="dashboard-content">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
