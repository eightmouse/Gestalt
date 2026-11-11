import { ArrowLeft, ArrowUpRight, ChevronRight, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";
import pocket from "@/public/pocket-index.js";
import type { RecordEntry, RecordSection } from "@/lib/types";

export function PocketHeader({ searchOpen, onSearch, onSettings, localReview }: { searchOpen: boolean; onSearch: () => void; onSettings: () => void; localReview?: ReactNode }) {
  return <header className="pocket-header">
    <div className="pocket-brand"><strong>GESTALT</strong><small>HANDHELD FIELD MODE</small></div>
    <div className="pocket-tools">
      <button type="button" data-search-toggle aria-expanded={searchOpen} onClick={onSearch}><Search size={16} aria-hidden="true" />Search</button>
      <button type="button" data-open-os-behaviour aria-haspopup="dialog" onClick={onSettings}><Settings size={16} aria-hidden="true" />Settings</button>
      {localReview}
    </div>
  </header>;
}

export function PocketIndex({ latest, onSection, onRead, onBack }: { latest?: RecordEntry; onSection: (section: RecordSection) => void; onRead: (record: RecordEntry) => void; onBack: () => void }) {
  return <>
    <div className="pocket-context"><button type="button" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back to Index</button></div>
    <div className="pocket-index">
      <div className="pocket-register"><div><small>// FIELD DIRECTORY</small><h1>Archive index</h1></div><span className="pocket-stamp" aria-hidden="true"><i /><i /><i /></span></div>
      <nav className="pocket-directory" aria-label="Archive sections">
        {pocket.directory.map(([id, number, label]) => <button type="button" key={id} data-pocket-section-link={id} onClick={() => onSection(id)}>
          <small aria-hidden="true">{number}</small><span className="nav-mark" data-icon={id} aria-hidden="true" /><strong>{label}</strong><ChevronRight size={16} aria-hidden="true" />
        </button>)}
      </nav>
      {latest ? <button className="pocket-dispatch" type="button" onClick={() => onRead(latest)}><span><small>LATEST FIELD NOTE</small><strong>{latest.title}</strong></span><ArrowUpRight size={16} aria-hidden="true" /></button> : null}
    </div>
  </>;
}

export function PocketBoot() {
  return <div className="pocket-boot-mount" dangerouslySetInnerHTML={{ __html: pocket.bootMarkup }} />;
}
