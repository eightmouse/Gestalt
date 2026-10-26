"use client";

import type { PublishState, PublishSummary, StudioPendingChanges } from "@/lib/studio-client-api";

export function PublishNotificationPanel({ changes, error, notification, saving, checking = false, refreshRequired, onClose, onPublish, onRefresh, onRetry, onReview }: {
  changes: StudioPendingChanges | null;
  error: string;
  notification: PublishState | null;
  saving: boolean;
  checking?: boolean;
  refreshRequired: boolean;
  onClose: () => void;
  onPublish: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onReview: (id: string) => void;
}) {
  return <aside className="studio-notification-panel studio-change-review-panel" aria-label="Pending archive changes">
    <div className="studio-notification-head">
      <div><p>// CHANGE REVIEW</p><h2>{changes?.records.length ?? 0} pending {changes?.records.length === 1 ? "record" : "records"}</h2><small>{changes?.changedFiles ?? 0} publishable files</small></div>
      <button type="button" onClick={onClose} aria-label="Close change review">Close</button>
    </div>
    {checking ? <p className="studio-pending-guidance" role="status">Checking saved changes...</p> : null}
    {error ? <p className="studio-change-review-error" role="alert">{error}</p> : null}
    {changes?.siteCodeFiles?.length ? <div className="studio-pending-guidance" role="status"><strong>Site update pending</strong><p>Saved notes are safe. These site files need a reviewed code commit before this batch can be published.</p><details><summary>View site files ({changes.siteCodeFiles.length})</summary><ul>{changes.siteCodeFiles.map((file) => <li key={file}>{file}</li>)}</ul></details></div> : null}
    <ol className="studio-pending-records">
      {changes?.records.map((record) => <li key={record.id} data-change={record.change}>
        <span className="studio-pending-kind">{record.change}</span><div><strong>{record.title}</strong><small>{record.section ?? "archive"} / {record.id}</small></div>
        {record.change === "deleted" ? <i>REMOVAL</i> : <button type="button" disabled={saving} onClick={() => onReview(record.id)}>Review</button>}
      </li>)}
      {changes && changes.records.length === 0 ? <li className="studio-pending-empty">No saved record edits are waiting to publish.</li> : null}
    </ol>
    {changes && (changes.mediaFiles > 0 || changes.staticDataChanged) ? <p className="studio-pending-assets">{changes.mediaFiles > 0 ? `${changes.mediaFiles} media file${changes.mediaFiles === 1 ? "" : "s"}` : "No new media"}{changes.staticDataChanged ? " . Static archive index updated" : ""}</p> : null}
    {changes && changes.unpushedCommits > 0 ? <p className="studio-pending-assets">{changes.unpushedCommits} local commit{changes.unpushedCommits === 1 ? " is" : "s are"} waiting to reach GitHub.</p> : null}
    <p className="studio-pending-guidance">Unsaved drafts are not included. Save each record first. A successful push still needs a Pages deployment.</p>
    {refreshRequired ? <button className="studio-publish-all" type="button" disabled={saving} onClick={onRefresh}>Refresh archive</button> : null}
    {error ? <button className="studio-publish-all" type="button" disabled={saving || checking} onClick={onRetry}>Retry change review</button> : null}
    <button className="studio-publish-all" type="button" disabled={saving || checking || Boolean(error) || Boolean(changes?.siteCodeFiles?.length) || refreshRequired || !(changes?.changedFiles || changes?.unpushedCommits)} onClick={onPublish}>{saving ? "Working..." : changes?.siteCodeFiles?.length ? "Waiting for site update" : "Publish all pending changes"}</button>
    {notification ? <article className={`studio-notification-card is-${notification.phase}`} role="status">
      <div className="studio-last-publish"><strong>{notification.title}</strong><span>{notification.detail}</span></div>
      {notification.summary ? <PublishSummaryGrid summary={notification.summary} /> : null}
      {notification.output ? <details><summary>Output</summary><pre>{notification.output.trim().split(/\r?\n/).filter(Boolean).slice(-34).join("\n")}</pre></details> : null}
    </article> : null}
  </aside>;
}

function PublishSummaryGrid({ summary }: { summary: PublishSummary }) {
  const rows = [
    ["COMMIT", summary.commit ? summary.commit.slice(0, 7) : "Pending"], ["BRANCH", summary.branch ?? "main"],
    ["FILES", summary.changedFiles === undefined ? "0" : String(summary.changedFiles)],
    ["RECORDS", summary.recordsChanged?.length ? summary.recordsChanged.join(", ") : "None"],
    ["MEDIA", summary.mediaAdded === undefined ? "0" : String(summary.mediaAdded)], ["STATIC", summary.staticExported ? "Exported" : "Not exported"],
    ["CACHE", summary.cacheToken ? summary.cacheToken.slice(-6) : "None"]
  ];
  return <dl className="studio-publish-summary">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
