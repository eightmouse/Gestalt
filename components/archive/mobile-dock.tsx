"use client";

import type { RecordSection } from "@/lib/types";

type MobileDockProps = {
  activeSection: RecordSection;
  onHome: () => void;
  onOpenSection: (section: RecordSection) => void;
};

export function MobileDock({ activeSection, onHome, onOpenSection }: MobileDockProps) {
  return (
    <nav className="mobile-dock" aria-label="Mobile archive sections">
      <button className={activeSection === "setup" ? "is-active" : ""} type="button" onClick={() => onOpenSection("setup")}>
        <span className="nav-mark" data-icon="setup" aria-hidden="true" />
        <small>Setup</small>
      </button>
      <button className={activeSection === "logs" ? "is-active" : ""} type="button" onClick={() => onOpenSection("logs")}>
        <span className="nav-mark" data-icon="logs" aria-hidden="true" />
        <small>Logs</small>
      </button>
      <button className={activeSection === "system" ? "is-active is-center" : "is-center"} type="button" onClick={onHome}>
        <span className="nav-mark" data-icon="system" aria-hidden="true" />
        <small>Dashboard</small>
      </button>
      <button className={activeSection === "games" ? "is-active" : ""} type="button" onClick={() => onOpenSection("games")}>
        <span className="nav-mark" data-icon="games" aria-hidden="true" />
        <small>Games</small>
      </button>
      <button className={activeSection === "projects" ? "is-active" : ""} type="button" onClick={() => onOpenSection("projects")}>
        <span className="nav-mark" data-icon="projects" aria-hidden="true" />
        <small>Projects</small>
      </button>
    </nav>
  );
}
