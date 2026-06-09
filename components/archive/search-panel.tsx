"use client";

import type { RefObject } from "react";
import { cipherizeText } from "@/components/archive/cipher";
import type { SearchResult } from "@/components/archive/types";

type SearchPanelProps = {
  panelRef: RefObject<HTMLDivElement | null>;
  query: string;
  results: SearchResult[];
  onOpenResult: (result: SearchResult) => void;
  onQueryChange: (query: string) => void;
};

export function SearchPanel({ panelRef, query, results, onOpenResult, onQueryChange }: SearchPanelProps) {
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
            <button key={result.kind === "record" ? result.record.id : result.id} type="button" onClick={() => onOpenResult(result)}>
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
    </div>
  );
}
