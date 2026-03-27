import type { ReactNode } from "react";
import type { DesktopPageKey } from "../../App";
import { Button } from "../ui/Button";

type NavItem = {
  page: DesktopPageKey;
  label: string;
  icon: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Primary Path",
    items: [
      { page: "pm", label: "New Task", icon: "message" },
      { page: "search", label: "Recent Results", icon: "search" },
      { page: "command-tower", label: "Task Progress", icon: "tower" },
    ],
  },
  {
    title: "Advanced Actions",
    items: [
      { page: "overview", label: "Task Overview", icon: "grid" },
      { page: "runs", label: "Runs", icon: "play" },
      { page: "workflows", label: "Workflows", icon: "workflow" },
      { page: "god-mode", label: "Fast Approval", icon: "zap" },
    ],
  },
  {
    title: "Operator / Governance",
    items: [
      { page: "events", label: "Event Stream", icon: "activity" },
      { page: "agents", label: "Agents", icon: "bot" },
      { page: "reviews", label: "Reviews", icon: "check" },
      { page: "change-gates", label: "Change Gates", icon: "shield" },
      { page: "tests", label: "Tests", icon: "test" },
      { page: "contracts", label: "Contracts", icon: "file" },
      { page: "policies", label: "Policies", icon: "lock" },
      { page: "locks", label: "Locks", icon: "key" },
      { page: "worktrees", label: "Worktrees", icon: "tree" },
    ],
  },
];

const ICON_MAP: Record<string, ReactNode> = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  message: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h10a1 1 0 011 1v6a1 1 0 01-1 1H6l-3 3V4a1 1 0 011-1z" />
    </svg>
  ),
  tower: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v12M4 6h8M5 2h6M3 14h10" />
    </svg>
  ),
  play: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M6.5 5.5l4 2.5-4 2.5z" fill="currentColor" />
    </svg>
  ),
  workflow: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="4" cy="12" r="2" />
      <path d="M6 4h4l2 4M6 12h4l2-4" />
    </svg>
  ),
  activity: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8h3l1.5-4 3 8L11 8h3" />
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l5 2v4c0 3-2.5 5-5 6-2.5-1-5-3-5-6V4l5-2z" />
    </svg>
  ),
  file: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M9 2v4h4" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 8l2 2 3.5-3.5" />
    </svg>
  ),
  test: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v4l-3 7h10l-3-7V2M5 2h6" />
    </svg>
  ),
  lock: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7V5a3 3 0 016 0v2" />
    </svg>
  ),
  bot: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="10" height="9" rx="2" />
      <circle cx="6" cy="8" r="1" fill="currentColor" />
      <circle cx="10" cy="8" r="1" fill="currentColor" />
      <path d="M8 1v3" />
    </svg>
  ),
  key: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="10.5" r="3" />
      <path d="M8 8l5-5M11 3l2 2" />
    </svg>
  ),
  tree: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14V8h0M8 14V2M12 14V6" />
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="8" cy="2" r="1.5" />
      <circle cx="12" cy="6" r="1.5" />
    </svg>
  ),
  zap: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1L3 9h5l-1 6 6-8H8l1-6z" />
    </svg>
  ),
};

type AppSidebarProps = {
  activePage: DesktopPageKey;
  onNavigate: (page: DesktopPageKey) => void;
};

export function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
  return (
    <aside className="sidebar" aria-label="Application navigation">
      <div className="sidebar-brand">
        <Button
          type="button"
          unstyled
          className="brand-link sidebar-brand-reset"
          onClick={() => onNavigate("pm")}
        >
          CortexPilot Command Tower
        </Button>
        <p className="sidebar-subtitle">Local-first task execution product</p>
      </div>
      <nav className="sidebar-nav" aria-label="Page group navigation">
        {NAV_SECTIONS.map((section) => (
          <section key={section.title} className="sidebar-section">
            <h2 className="sidebar-section-title">{section.title}</h2>
            <ul className="sidebar-list">
              {section.items.map((item) => {
                const isCurrent = activePage === item.page;
                return (
                  <li key={item.page}>
                    <Button
                      type="button"
                      unstyled
                      aria-current={isCurrent ? "page" : undefined}
                      className={`sidebar-link ${isCurrent ? "is-active" : ""}`}
                      onClick={() => onNavigate(item.page)}
                    >
                      {ICON_MAP[item.icon] || null}
                      {item.label}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}
