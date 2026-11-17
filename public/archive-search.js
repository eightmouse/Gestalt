(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GestaltArchiveSearch = factory();
})(globalThis, function () {
  const indexes = new WeakMap();
  const normalize = (value) => value.trim().toLowerCase();

  const commands = [
    { kind: "command", id: "cmd-dashboard", title: "Open dashboard", detail: "Jump to system snapshot", section: "system" },
    { kind: "command", id: "cmd-timeline", title: "Open timeline", detail: "Reconstruct recent archive activity", action: "timeline" },
    { kind: "command", id: "cmd-roadmap", title: "Open roadmap", detail: "Work in progress and filed milestones", action: "roadmap" },
    { kind: "command", id: "cmd-connections", title: "Connections", detail: "External channels and social profiles", action: "connections" },
    { kind: "command", id: "cmd-os-behaviour", title: "Settings", detail: "Startup, navigation and display settings", action: "behaviour" },
    { kind: "command", id: "cmd-projects", title: "Open projects", detail: "Browse active and filed processes", section: "projects" },
    { kind: "command", id: "cmd-games", title: "Open games", detail: "Browse session and past logs", section: "games" },
    { kind: "command", id: "cmd-logs", title: "Open logs", detail: "Browse field notes", section: "logs" }
  ];

  function buildIndex(records, notesFor) {
    const entries = [];
    for (const record of records) {
      if (record.section === "system") continue;
      const notes = notesFor(record);
      entries.push({
        title: normalize(record.title),
        terms: normalize([record.type, record.status, record.section, record.summary, ...notes.filter((note) => !note.id).map((note) => note.title)].join(" ")),
        date: record.updated,
        result: { kind: "record", record, detail: `${record.type} / ${record.status}` }
      });
      const ids = new Map();
      for (const note of notes) if (note.id) ids.set(note.id, (ids.get(note.id) ?? 0) + 1);
      for (const note of notes) {
        if (!note.id || ids.get(note.id) !== 1 || (note.id === "main" && note.title === "Current note")) continue;
        const datePrefix = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*[-:\u2013\u2014]?\s*/.exec(note.title.trim());
        const title = (datePrefix ? note.title.trim().slice(datePrefix[0].length) : note.title).trim() || "Untitled note";
        const date = datePrefix ? `${datePrefix[3]}-${datePrefix[2].padStart(2, "0")}-${datePrefix[1].padStart(2, "0")}` : "";
        const detail = date ? `${record.title} \u00b7 ${date.split("-").reverse().join(" / ")}` : record.title;
        entries.push({
          title: normalize(title), terms: normalize(note.title), date: date || record.updated,
          result: { kind: "note", id: `${record.id}:${note.id}`, noteId: note.id, title, detail, record }
        });
      }
    }
    return entries;
  }

  function search(records, query, notesFor, currentGame, latestLog) {
    const term = normalize(query);
    if (!term) return commands.slice(0, 5);

    const shortQuery = term.length === 1;
    const matchedCommands = shortQuery ? [] : [
      ...commands,
      ...(currentGame ? [{ kind: "command", id: "cmd-active-game", title: "Open active game", detail: currentGame.title, record: currentGame, content: "notes" }] : []),
      ...(latestLog ? [{ kind: "command", id: "cmd-latest-log", title: "Open latest log", detail: latestLog.title, record: latestLog }] : [])
    ].filter((command) => normalize(`${command.title} ${command.detail}`).includes(term));

    // Both readers replace the record collection when saved content changes.
    let index = indexes.get(records);
    if (!index) {
      index = buildIndex(records, notesFor);
      indexes.set(records, index);
    }
    const matches = [];
    for (const entry of index) {
      const rank = entry.title === term ? 0
        : entry.title.startsWith(term) ? 1
        : shortQuery ? -1
        : entry.title.includes(term) ? 2
        : entry.terms.includes(term) ? 3 : -1;
      if (rank !== -1) matches.push({ ...entry, rank });
    }
    matches.sort((a, b) => a.rank - b.rank
      || (a.result.kind === "note") - (b.result.kind === "note")
      || b.date.localeCompare(a.date) || a.result.record.priority - b.result.record.priority);
    return [...matchedCommands, ...matches.slice(0, 6).map(({ result }) => result)].slice(0, 8);
  }

  function resultKey(result) {
    return `${result.kind}:${result.kind === "record" ? result.record.id : result.id}`;
  }

  return Object.freeze({ search, resultKey });
});
