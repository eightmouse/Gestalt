"use client";

import type { RefObject } from "react";
import { Settings } from "lucide-react";
import { renderCipherLetters } from "@/components/archive/headline-text";
import type { SearchResult } from "@/components/archive/types";
import archiveSearch from "@/public/archive-search.js";

type SearchPanelProps = {
  panelRef: RefObject<HTMLDivElement | null>;
  query: string;
  results: SearchResult[];
  onOpenResult: (result: SearchResult, returnKey?: string) => void;
  onQueryChange: (query: string) => void;
};

export function SearchPanel({ panelRef, query, results, onOpenResult, onQueryChange }: SearchPanelProps) {
  const open = (result: SearchResult) => onOpenResult(result, result.record ? archiveSearch.resultKey(result) : undefined);
  return (
    <div className="search-panel command-panel" ref={panelRef} role="search">
      <label htmlFor="archive-search" className="cipher-on-open">~ {renderCipherLetters("COMMAND PALETTE")}</label>
      <input
        autoComplete="off"
        autoFocus
        id="archive-search"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.defaultPrevented || event.nativeEvent.isComposing || event.repeat || event.metaKey || event.ctrlKey || event.altKey || !query.trim() || !results[0]) return;
          event.preventDefault();
          open(results[0]);
        }}
        placeholder="Find a record, note or command"
        type="search"
        value={query}
      />
      <div className="search-suggestions">
        {results.length > 0 ? (
          results.map((result) => (
            result.kind === "command" && result.action === "behaviour" ? (
              <button className="palette-settings-button" key={result.id} type="button" aria-haspopup="dialog" onClick={() => open(result)}>
                <Settings size={18} aria-hidden="true" /><strong>Settings</strong>
              </button>
            ) : (
            <button
              data-state={searchResultStateKey(result)}
              data-search-result={result.record ? archiveSearch.resultKey(result) : undefined}
              key={result.kind === "record" ? result.record.id : result.id}
              type="button"
              aria-haspopup={result.kind === "command" && result.action === "connections" ? "dialog" : undefined}
              onClick={() => open(result)}
            >
              <span>
                <strong>
                  {result.kind === "record" ? result.record.title : result.title}
                </strong>
                <small className={result.kind === "command" ? "cipher-description" : undefined}>
                  {result.kind === "command" ? renderCipherLetters(result.detail) : result.detail}
                </small>
              </span>
              <i>{result.kind === "record" ? result.record.section.toUpperCase() : result.kind === "note" ? "NOTE" : "CMD"}</i>
            </button>
            )
          ))
        ) : (
          <p className="search-empty">No matching records, notes or commands.</p>
        )}
      </div>
    </div>
  );
}

function searchResultStateKey(result: SearchResult): string | undefined {
  const status = result.record?.status;

  return status ? status.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown" : undefined;
}
