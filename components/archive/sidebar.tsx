"use client";

import { motion } from "framer-motion";
import { formatDate, formatReadableDate, type ArchiveMetrics } from "@/components/archive/record-utils";
import type { RecordEntry, RecordSection } from "@/lib/types";

export const sections: Array<{
  id: RecordSection;
  code: string;
  label: string;
  cipher: string;
  icon: string;
}> = [
  { id: "system", code: "01_SYSTEM", label: "Dashboard", cipher: "âŒ–â•³â•µâŒâŸâŒ°â•³âŸŸ", icon: "system" },
  { id: "projects", code: "02_PROJECTS", label: "Active Processes", cipher: "âŸâŒ°â•³âŒ–â•µ / âŒâŸŸâŒ–â•³âŒ°", icon: "projects" },
  { id: "games", code: "03_GAMES", label: "Session Logs", cipher: "â•³âŒâŸŸâŸâŒ° / â•µâŒ–âŒâ•³", icon: "games" },
  { id: "logs", code: "04_LOGS", label: "Field Notes", cipher: "âŒ°â•³â•µâŒ– / âŸŸâŒâŒ°â•³â•µ", icon: "logs" },
  { id: "setup", code: "05_SETUP", label: "Hardware & Software", cipher: "âŒ–âŸŸâŒ°â•³â•µ / âŒâŸâŒ–", icon: "setup" },
  { id: "archive", code: "06_ARCHIVE", label: "Deprecated Records", cipher: "â•µâŒ–âŸâŒ°âŒ / â•³âŸŸâŒ–â•µ", icon: "archive" }
];

type SidebarProps = {
  activeSection: RecordSection;
  metrics: ArchiveMetrics;
  navOpen: boolean;
  now: Date | null;
  onHome: () => void;
  onOpenSection: (section: RecordSection) => void;
  onToggleNav: () => void;
};

export function Sidebar({
  activeSection,
  metrics,
  navOpen,
  now,
  onHome,
  onOpenSection,
  onToggleNav
}: SidebarProps) {
  const activeConfig = sections.find((section) => section.id === activeSection) ?? sections[0];

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="mobile-brand-meta">
          <span>v1.26.35</span>
          <span>HANDHELD FIELD MODE</span>
        </div>
        <div className="mobile-clock" aria-label="Archive date">
          <span>{formatDate(now)}</span>
        </div>
        <div className="brand-row">
          <button className="brand" type="button" onClick={onHome}>
            GESTALT
          </button>
          <button
            className={navOpen ? "archive-menu-toggle is-active" : "archive-menu-toggle"}
            type="button"
            aria-expanded={navOpen}
            aria-label="Open archive navigation"
            onClick={onToggleNav}
          >
            <span className="archive-menu-glyph" aria-hidden="true">
              <i />
            </span>
            <span className="archive-menu-code">{activeConfig.code}</span>
          </button>
        </div>
        <div className="desktop-brand-meta">
          <span className="version-label">v1.26.35</span>
          <span className="desktop-mode-label">OPERATOR DESK MODE</span>
        </div>
        <i aria-hidden="true">-</i>
      </div>

      <nav aria-label="Archive navigation">
        <p className="sidebar-label">// ARCHIVE NAVIGATION</p>
        <div className="nav-stack">
          {sections.map((section) => (
            <div className="nav-group" key={section.id}>
              <button
                type="button"
                className={activeSection === section.id ? "nav-trigger is-active" : "nav-trigger"}
                onClick={() => onOpenSection(section.id)}
              >
                <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
                <span className="nav-label">
                  <strong>{section.code}</strong>
                  <small className="nav-readable" data-cipher={section.cipher}>{section.label}</small>
                  <small className="nav-cipher" aria-hidden="true">{section.cipher}</small>
                </span>
                <span className="section-signal" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </nav>

      <div className="system-status">
        <p>// SYSTEM STATUS</p>
        <dl>
          <div>
            <dt>USER</dt>
            <dd>Eightmouse</dd>
          </div>
          <div>
            <dt>RECORDS</dt>
            <dd>{metrics.recordCount}</dd>
          </div>
          <div>
            <dt>MEDIA</dt>
            <dd>{metrics.mediaCount}</dd>
          </div>
          <div>
            <dt>ACTIVE PRJ</dt>
            <dd>{metrics.activeProjects}</dd>
          </div>
          <div>
            <dt>ACTIVE GAME</dt>
            <dd>{metrics.activeGame?.title ?? "None"}</dd>
          </div>
          <div>
            <dt>LAST FILED</dt>
            <dd>{formatReadableDate(metrics.latestActivityDate)}</dd>
          </div>
          <div>
            <dt>OS VERSION</dt>
            <dd>GESTALT OS v1.26.35</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

type ArchiveNavigationMenuProps = {
  activeSection: RecordSection;
  currentGame?: RecordEntry;
  onClose: () => void;
  onOpenCurrent: () => void;
  onOpenSearch: () => void;
  onOpenSection: (section: RecordSection) => void;
  onOpenTimeline: () => void;
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  searchOpen: boolean;
};

export function ArchiveNavigationMenu({
  activeSection,
  currentGame,
  onClose,
  onOpenCurrent,
  onOpenSearch,
  onOpenSection,
  onOpenTimeline,
  onSearchQueryChange,
  searchQuery,
  searchOpen
}: ArchiveNavigationMenuProps) {
  const renderSectionButton = (section: (typeof sections)[number]) => (
    <div className="nav-group" key={section.id}>
      <button
        type="button"
        className={activeSection === section.id ? "nav-trigger is-active" : "nav-trigger"}
        onClick={() => onOpenSection(section.id)}
      >
        <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
        <span className="nav-label">
          <strong>{section.code}</strong>
          <small className="nav-readable" data-cipher={section.cipher}>{section.label}</small>
          <small className="nav-cipher" aria-hidden="true">{section.cipher}</small>
        </span>
        <span className="section-signal" aria-hidden="true" />
      </button>
    </div>
  );

  const archiveSections = sections.filter((section) => section.id === "archive");

  return (
    <>
      <motion.button
        aria-label="Close archive navigation"
        className="archive-nav-backdrop"
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.nav
        aria-label="Archive navigation"
        className="archive-nav-panel"
        initial={{ opacity: 0, x: -18, filter: "blur(2px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0)" }}
        exit={{ opacity: 0, x: -18, filter: "blur(2px)" }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <header>
          <p>// ARCHIVE NAVIGATION</p>
          <span>UTILITY / DEEP ARCHIVE</span>
        </header>
        <div className="archive-nav-actions archive-nav-actions--desktop" aria-label="Quick archive actions">
          <button className={searchOpen ? "is-active" : ""} type="button" onClick={onOpenSearch}>
            <span className="search-icon" aria-hidden="true" />
            Search
          </button>
          <button type="button" onClick={onOpenTimeline}>
            <span>âŒ¬</span>
            Trace
          </button>
          <button disabled={!currentGame} type="button" onClick={onOpenCurrent}>
            <span>â—‡</span>
            Current
          </button>
          <button type="button" onClick={() => onOpenSection("logs")}>
            <span>{"\u2261"}</span>
            Logs
          </button>
        </div>
        <div className="archive-nav-search archive-nav-search--mobile" role="search">
          <label htmlFor="mobile-archive-search">// SEARCH</label>
          <input
            id="mobile-archive-search"
            type="search"
            value={searchQuery}
            placeholder="Search records"
            autoComplete="off"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <div className="archive-nav-actions archive-nav-actions--mobile" aria-label="Mobile archive actions">
          <button type="button" onClick={onOpenTimeline}>
            <span>{"\u232C"}</span>
            Trace
          </button>
          <button disabled={!currentGame} type="button" onClick={onOpenCurrent}>
            <span>{"\u25C7"}</span>
            Current
          </button>
        </div>
        <div className="nav-stack nav-stack--desktop">
          {sections.map(renderSectionButton)}
        </div>
        <div className="nav-stack nav-stack--mobile-archive">
          {archiveSections.map(renderSectionButton)}
        </div>
      </motion.nav>
    </>
  );
}
