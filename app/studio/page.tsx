import { StudioClient } from "@/components/studio-client";
import { getRecords } from "@/lib/content";

export default function StudioPage() {
  if (process.env.NODE_ENV !== "development") {
    return (
      <main className="archive-shell studio-shell">
        <section className="studio-workspace studio-disabled" aria-label="Gestalt studio disabled">
          <p className="route-label">// LOCAL STUDIO</p>
          <h1>Studio Offline<span className="cursor">_</span></h1>
          <p className="subtle">The editor is disabled outside local development. Clone the repo and run it locally to edit entries.</p>
          <a className="studio-return" href="/">Return to Archive</a>
        </section>
      </main>
    );
  }

  const records = getRecords().filter((record) => record.section !== "system");

  return <StudioClient records={records} />;
}
