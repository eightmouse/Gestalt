import { ArrowLeft, ArrowUpRight, ChevronRight, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { shortDate, type ActivityEntry } from "@/components/archive/record-utils";
import pocket from "@/public/pocket-index.js";
import type { RecordEntry, RecordSection } from "@/lib/types";

export function PocketHeader({ searchOpen, onHome, onSearch, onSettings, localReview }: { searchOpen: boolean; onHome: () => void; onSearch: () => void; onSettings: () => void; localReview?: ReactNode }) {
  return <header className="pocket-header">
    <button className="pocket-brand" type="button" aria-label="Gestalt home" onClick={onHome}><strong>GESTALT</strong><small>HANDHELD FIELD MODE</small></button>
    <div className="pocket-tools">
      <button type="button" data-search-toggle aria-expanded={searchOpen} onClick={onSearch}><Search size={16} aria-hidden="true" />Search</button>
      <button type="button" data-open-os-behaviour aria-haspopup="dialog" onClick={onSettings}><Settings size={16} aria-hidden="true" />Settings</button>
      {localReview}
    </div>
  </header>;
}

export function PocketIndex({ latest, dispatches, onSection, onRead, onBack }: {
  latest?: RecordEntry;
  dispatches: ActivityEntry[];
  onSection: (section: RecordSection) => void;
  onRead: (record: RecordEntry, dispatch?: ActivityEntry) => void;
  onBack: () => void;
}) {
  return <>
    <div className="pocket-context"><button type="button" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back to Index</button></div>
    <div className="pocket-index">
      <div className="pocket-register"><div><small>// FIELD DIRECTORY</small><h1>Archive index</h1></div><span className="pocket-stamp" aria-hidden="true"><i /><i /><i /></span></div>
      <nav className="pocket-directory" aria-label="Archive sections">
        {pocket.directory.map(([id, number, label]) => <button type="button" key={id} data-pocket-section-link={id} onClick={() => onSection(id)}>
          <small aria-hidden="true">{number}</small><span className="nav-mark" data-icon={id} aria-hidden="true" /><strong>{label}</strong><ChevronRight size={16} aria-hidden="true" />
        </button>)}
      </nav>
      {latest || dispatches.length ? <section className="pocket-dispatches" aria-label="Recent dispatches">
        {latest ? <button className="pocket-dispatch" type="button" onClick={() => onRead(latest)}><span><small>LATEST FIELD NOTE</small><strong>{latest.title}</strong></span><ArrowUpRight size={16} aria-hidden="true" /></button> : null}
        {dispatches.length ? <div className="pocket-dispatch-list">
          <p>// RECENT DISPATCHES</p>
          {dispatches.map((dispatch) => <button className="pocket-dispatch-row" type="button" key={dispatch.id} onClick={() => onRead(dispatch.record, dispatch)}>
            <time dateTime={dispatch.date}>{shortDate(dispatch.date)}</time>
            <span><strong>{dispatch.noteTitle || dispatch.title}</strong>{dispatch.noteTitle && dispatch.noteTitle !== dispatch.title ? <small>{dispatch.title}</small> : null}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>)}
        </div> : null}
      </section> : null}
    </div>
  </>;
}

export function PocketBoot() {
  return <div className="pocket-boot-mount" dangerouslySetInnerHTML={{ __html: pocket.bootMarkup }} />;
}
