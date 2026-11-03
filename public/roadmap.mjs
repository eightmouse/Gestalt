// Curated public copy only. This file never imports the internal development roadmap.
export const publicRoadmap = {
  title: "On the desk",
  intro: "A few things in motion, a few ideas for later. Nothing here is a deadline ~",
  updated: "02 / 11 / 2026",
  groups: [
    {
      id: "working", title: "In progress", items: [
        { title: "Field notebook", detail: "Separate chapters, versioned history and the lighter opening have been reviewed. Local editing and dated history remain for a separate step." },
        { title: "Desktop consistency", detail: "Large-screen labels, manifest icons and Archive spacing now keep their desktop proportions. Continue real display/zoom checks without stretching the archive." },
        { title: "Cross-browser smoothness", detail: "Covered, hidden and offscreen effects now rest; pointer work is shared and bounded. Firefox/Edge timing comparisons remain open, especially opening records and returning to the workspace." }
      ]
    },
    {
      id: "ideas", title: "On the desk", items: [
        { title: "Less mechanical motion", detail: "Review repeating effects one at a time: varied rhythms, quiet pauses and distinct section identities, without restless reading text or heavier background work." },
        { title: "Living archive", detail: "Explore responsive light, layered depth and distinct reactions for each section. Evolve Memory State without a 3D rebuild, keeping reading quiet and motion optional. Finish the editing comforts first." },
        { title: "Month-by-month folders", detail: "Let older field notes settle into folders while newer ones stay within reach." }
      ]
    },
    {
      id: "done", title: "Filed", items: [
        { title: "Desktop proportions and quieter background work", detail: "Scaled reading labels and section manifests, consistent Archive footer spacing, shared reduced-motion-aware Memory State input, paused covered/offscreen effects and keyboard boundaries for record windows.", version: "v1.68.14" },
        { title: "Day, Night and window depth", detail: "A mineral-gray Day appearance alongside Night and local-clock Auto. Clearer labels, continuous window frames, tactile controls and slimmer entry bars, with permission-aware remembered preferences.", version: "v1.68.13" },
        { title: "Startup and notebook settling", detail: "Boot progress and brief signal interruptions vary between visits without extending startup. The notebook opens with lighter registration details; clicking its header or the Connections header no longer restarts the opening.", version: "v1.68.13" },
        { title: "Independent publishing", detail: "Saved notes publish against the committed site while unfinished visual work stays local. Interrupted publication can recover without sweeping unrelated code into a content update.", version: "v1.67.0" },
        { title: "Record closing and winter details", detail: "Closing dissolves the content before the frame contracts; minimizing keeps its own restore gesture. December and January join the calendar decorations, with seasonal details remaining optional.", version: "v1.65.0" },
        { title: "Terminal and window gestures", detail: "T opens a directory with real section dates and a compact restore icon. Search and Terminal construct their frames before the contents resolve; minimizing contracts toward the restore control without losing reading state. The greeting keeps up with local time and returning tabs.", version: "v1.64.6" },
        { title: "Artwork and shortcuts", detail: "Independent title-background framing for Projects and Games. Press S for a separate web-search bar that opens results in a new tab; Connections holds the public X and Reddit links behind its own signal-acquisition sequence.", version: "v1.64.2" },
        { title: "Editing comforts", detail: "Optional note-heading titles, styled native selectors and clear local save states. Progress labels keep focus while typing; unfinished recommendation and hardware text stays in a local draft when the editor closes. Saving and publishing remain separate.", version: "v1.61.1" },
        { title: "System Notices", detail: "First-visit shortcuts open a quiet reference tray beside minimized windows, then fade away when left alone. Remembered visits respect local-memory permission.", version: "v1.60.2" },
        { title: "Settings and startup", detail: "A square profile welcome and composed workspace arrival. A dedicated palette button controls entry animation, full or quick startup, seasonal details and Terminal or Legacy navigation. Remembered choices respect local-memory permission.", version: "v1.59.1" },
        { title: "Section reading space", detail: "Written project updates, game sessions and a field-note reading desk beside the existing lists.", version: "v1.56.0" },
        { title: "A clearer timeline", detail: "Recent signals grouped by date, with source selection and a more readable trail.", version: "v1.52.0" },
        { title: "Editing in place", detail: "Create, format and edit field notes, games and projects in their own windows. Saves stay local; the publishing bell reviews saved changes and publishes the batch separately from drafts.", version: "v1.52.0" },
        { title: "Steam and artwork", detail: "Automatic Current Game with playtime and achievements when available; adjustable game headers without changing original images.", version: "v1.47.0" },
        { title: "Session and Past Logs", detail: "Keep games to return to separate from completed or retired play logs.", version: "v1.43.0" },
        { title: "Full-size media", detail: "Open samples and screenshots outside the record window.", version: "v1.42.2" },
        { title: "Field Archive", detail: "A file-manager home for older notes, with original writing order preserved.", version: "v1.42.0" }
      ]
    }
  ]
};

// Filed history follows the curated newest-first order, grouped by real release.
export function buildRoadmapHistory(data) {
  const releases = new Map();
  for (const item of data.groups.find((group) => group.id === "done")?.items || []) {
    const version = item.version || "Unversioned";
    if (!releases.has(version)) releases.set(version, { version, title: item.title, items: [] });
    releases.get(version).items.push(item);
  }
  return [...releases.values()];
}
