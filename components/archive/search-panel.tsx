"use client";

import type { RefObject } from "react";
import { cipherizeText } from "@/components/archive/cipher";
import type { SearchResult } from "@/components/archive/types";
import type { EntryAccessMode } from "@/lib/entry-access";
import type { SeasonalMode } from "@/public/seasonal.js";
import type { DesktopNavigationMode } from "@/public/desktop-navigation.js";

type SearchPanelProps = {
  panelRef: RefObject<HTMLDivElement | null>;
  query: string;
  results: SearchResult[];
  onOpenResult: (result: SearchResult) => void;
  onQueryChange: (query: string) => void;
  entryAccessMode: EntryAccessMode;
  onEntryAccessModeChange: (mode: EntryAccessMode) => void;
  seasonalMode?: SeasonalMode;
  onSeasonalModeChange?: (mode: SeasonalMode) => void;
  desktopNavigationMode?: DesktopNavigationMode;
  onDesktopNavigationModeChange?: (mode: DesktopNavigationMode) => void;
};

export function SearchPanel({ panelRef, query, results, onOpenResult, onQueryChange, entryAccessMode, onEntryAccessModeChange, seasonalMode = "auto", onSeasonalModeChange, desktopNavigationMode = "fixed", onDesktopNavigationModeChange }: SearchPanelProps) {
  return (
    <div className="search-panel command-panel" ref={panelRef} role="search">
      <label htmlFor="archive-search" data-cipher={cipherizeText("COMMAND PALETTE")}>~ COMMAND PALETTE</label>
      <input
        autoComplete="off"
        autoFocus
        id="archive-search"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search records or type a command"
        type="search"
        value={query}
      />
      <div className="search-suggestions">
        {results.length > 0 ? (
          results.map((result) => (
            <button
              data-state={searchResultStateKey(result)}
              key={result.kind === "record" ? result.record.id : result.id}
              type="button"
              onClick={() => onOpenResult(result)}
            >
              <span>
                <strong>
                  {result.kind === "record" ? result.record.title : result.title}
                </strong>
                <small data-cipher={cipherizeText(result.detail)}>
                  {result.detail}
                </small>
              </span>
              <i>{result.kind === "record" ? result.record.section.toUpperCase() : "CMD"}</i>
            </button>
          ))
        ) : (
          <p className="search-empty">No matching command or record.</p>
        )}
      </div>
      <fieldset className="command-preferences">
        <legend>ENTRY ANIMATION</legend>
        <div className="command-preference-options">
          {([ ["first", "First entry only"], ["always", "Every entry"], ["off", "Off"] ] as const).map(([mode, label]) => (
            <label key={mode}>
              <input type="radio" name="entry-animation" value={mode} checked={entryAccessMode === mode} onChange={() => onEntryAccessModeChange(mode)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="command-preferences command-preferences--seasonal">
        <legend>SEASONAL DETAILS</legend>
        <div className="command-preference-options">
          {([["auto", "By calendar"], ["off", "Off"]] as const).map(([mode, label]) => <label key={mode}>
            <input type="radio" name="seasonal-details" value={mode} checked={seasonalMode === mode} onChange={() => onSeasonalModeChange?.(mode)} />
            <span>{label}</span>
          </label>)}
        </div>
      </fieldset>
      <fieldset className="command-preferences command-preferences--desktop-nav">
        <legend>DESKTOP NAVIGATION</legend>
        <div className="command-preference-options">
          {([["fixed", "Legacy Mode"], ["terminal", "Terminal"]] as const).map(([mode, label]) => <label key={mode}>
            <input type="radio" name="desktop-navigation" value={mode} checked={desktopNavigationMode === mode} onChange={() => onDesktopNavigationModeChange?.(mode)} />
            <span>{label}</span>
          </label>)}
        </div>
      </fieldset>
    </div>
  );
}

function searchResultStateKey(result: SearchResult): string | undefined {
  const status = result.kind === "record" ? result.record.status : result.record?.status;

  return status ? status.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown" : undefined;
}
