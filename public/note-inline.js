(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltNoteInline = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  function safeNoteHref(value) {
    if (typeof value !== "string" || /[\\\s\u0000-\u001f\u007f]/.test(value) || !/^https?:\/\//i.test(value)) return null;
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  }

  function tokenizeNoteInline(value, depth = 0, allowLinks = true) {
    const text = String(value);
    if (depth >= 6 || text.length > 32768) return [{ type: "text", value: text }];
    const tokens = [];
    const exhausted = new Set();
    let plain = "";
    let index = 0;
    const flush = () => {
      if (plain) tokens.push({ type: "text", value: plain });
      plain = "";
    };
    const escaped = (at) => {
      let count = 0;
      while (at > 0 && text[--at] === "\\") count += 1;
      return count % 2 === 1;
    };
    const closing = (marker, from) => {
      if (exhausted.has(marker)) return -1;
      let at = text.indexOf(marker, from);
      while (at !== -1) {
        if (marker[0] === "*") {
          const codeStart = text.indexOf("`", from);
          if (codeStart !== -1 && codeStart < at && !escaped(codeStart)) {
            let runEnd = codeStart + 1;
            while (text[runEnd] === "`") runEnd += 1;
            const codeMarker = text.slice(codeStart, runEnd);
            const codeEnd = codeMarker.length <= 8 ? closing(codeMarker, runEnd) : -1;
            from = codeEnd === -1 ? runEnd : codeEnd + codeMarker.length;
            at = text.indexOf(marker, from);
            continue;
          }
        }
        if ((marker[0] === "`" || !escaped(at)) && text[at - 1] !== marker[0] && text[at + marker.length] !== marker[0]) return at;
        from = at + marker.length;
        at = text.indexOf(marker, from);
      }
      exhausted.add(marker);
      return -1;
    };

    while (index < text.length && tokens.length < 2048) {
      const char = text[index];
      if (char === "\\" && /[\\*`[\]()]/.test(text[index + 1] || "")) {
        plain += text[index + 1];
        index += 2;
        continue;
      }
      if (char === "`" || char === "*") {
        let endRun = index + 1;
        while (text[endRun] === char) endRun += 1;
        const length = endRun - index;
        const marker = char.repeat(length);
        const end = length <= (char === "*" ? 3 : 8) ? closing(marker, endRun) : -1;
        if (end > endRun && !/[\r\n]/.test(text.slice(endRun, end))) {
          flush();
          const content = text.slice(endRun, end);
          if (char === "`") tokens.push({ type: "code", value: content });
          else {
            const children = tokenizeNoteInline(content, depth + 1, allowLinks);
            tokens.push(length === 3
              ? { type: "strong", children: [{ type: "em", children }] }
              : { type: length === 2 ? "strong" : "em", children });
          }
          index = end + length;
          continue;
        }
        plain += marker;
        index = endRun;
        continue;
      }
      if (char === "[" && text[index - 1] !== "!" && allowLinks && !exhausted.has("link")) {
        const labelEnd = text.indexOf("](", index + 1);
        if (labelEnd === -1) exhausted.add("link");
        else {
          let end = labelEnd + 2;
          let nesting = 1;
          while (end < text.length && nesting > 0 && !/[\r\n]/.test(text[end])) {
            if (text[end] === "(") nesting += 1;
            if (text[end] === ")") nesting -= 1;
            end += 1;
          }
          if (nesting === 0) {
            const href = safeNoteHref(text.slice(labelEnd + 2, end - 1));
            const label = text.slice(index + 1, labelEnd);
            if (href && label && !/[\r\n[\]]/.test(label)) {
              flush();
              tokens.push({ type: "link", href, children: tokenizeNoteInline(label, depth + 1, false) });
            } else plain += text.slice(index, end);
            index = end;
            continue;
          }
          exhausted.add("link");
        }
      }
      plain += char;
      index += 1;
    }
    plain += text.slice(index);
    flush();
    return tokens;
  }

  const validNoteId = (id) => typeof id === "string" && /^(?:main|n-[a-f0-9]{32})$/.test(id);

  function noteHeading(line, fallback = "Untitled note") {
    const heading = /^:::(?:previous-note|note) (.*)$/.exec(line);
    if (!heading) return null;
    const text = heading[1].trim();
    const identity = /(?:^| )\{#(main|n-[a-f0-9]{32})\}$/.exec(text);
    return identity
      ? { title: text.slice(0, identity.index).trim() || fallback, id: identity[1] }
      : { title: text || fallback };
  }

  function parseNotes(body) {
    const lines = body.split(/\r?\n/);
    const notes = [];
    for (let index = 0; index < lines.length; index++) {
      const heading = noteHeading(lines[index]);
      if (!heading) continue;
      const start = ++index;
      while (index < lines.length && lines[index].trim() !== ":::") index++;
      notes.push({ ...heading, body: lines.slice(start, index).join("\n").trim() });
    }
    if (!notes.length && body.trim()) notes.push({ id: "main", title: "Current note", body: body.trim() });
    return notes;
  }

  function addNoteIds(body, createId) {
    const parts = body.split(/(\r?\n)/);
    let inNote = false;
    for (let index = 0; index < parts.length; index += 2) {
      const line = parts[index];
      if (inNote) {
        if (line.trim() === ":::") inNote = false;
        continue;
      }
      const heading = noteHeading(line);
      if (!heading) continue;
      inNote = true;
      if (!heading.id) {
        const id = createId();
        if (!validNoteId(id)) throw new Error("Invalid generated note identity.");
        parts[index] = `${line} {#${id}}`;
      }
    }
    return parts.join("");
  }

  function noteIndexById(notes, id) {
    if (!validNoteId(id)) return -1;
    const index = notes.findIndex((note) => note.id === id);
    return index >= 0 && !notes.slice(index + 1).some((note) => note.id === id) ? index : -1;
  }

  return { safeNoteHref, tokenizeNoteInline, validNoteId, noteHeading, parseNotes, addNoteIds, noteIndexById };
});
