import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const source = read("static-app.js");
const ast = ts.createSourceFile("static-app.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ["syncRecordWindow", "syncWorkspaceFocus", "syncRecordWindowChrome", "removeReadingWindows", "removeArchiveFolderWindow", "syncArchiveFolderWindow", "openArchiveFolder", "closeArchiveFolder", "dismissArchiveMenu", "syncTimelineWindow", "openTimeline", "closeTimeline", "syncRoadmapWindow", "openRoadmap", "closeRoadmap", "closeRecord", "completeBoot", "openOsBehaviour", "syncOsBehaviourDialog", "openSection", "openHome", "workspaceHeading", "syncSection"].map((name) => {
  const node = ast.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `${name} exists`);
  return node.getText(ast);
}).join("\n");
const nodes = new Map();
const classes = () => ({ values: new Set(), add(name) { this.values.add(name); }, toggle(name, on) { if (on) this.values.add(name); else this.values.delete(name); }, remove(...names) { for (const name of names) this.values.delete(name); } });
const node = (selector) => {
  const value = { classList: classes(), remove() { nodes.delete(selector); }, style: { removeProperty(name) { value.removedStyle = name; } }, removeAttribute(name) { value.removedAttribute = name; },
    insertAdjacentHTML(where, html) { value.inserted = { where, html }; } };
  nodes.set(selector, value);
  return value;
};
const shell = node(".archive-shell"), workspace = node(".workspace"), dashboard = node(".dashboard-grid");
const background = node(".grain-layer");
const trayNode = node(".workspace-window-tray"), restoreNode = node(".reopen-control");
workspace.querySelector = (selector) => selector === ":scope > .archive-folder-page" ? nodes.get(".workspace > .archive-folder-page") : null;
workspace.querySelectorAll = (selector) => {
  assert.equal(selector, ":scope > :is(.record-window, .timeline-window, [data-record-backdrop], [data-timeline-close])");
  return [".record-window", ".timeline-window", "[data-record-backdrop]", "[data-timeline-close]"].map((key) => nodes.get(key)).filter(Boolean);
};
dashboard.scrollTop = 146;
let renders = 0, focusSyncs = 0, navigationSyncs = 0, stopped = 0, completion;
const context = vm.createContext({
  window: {}, syncMemoryTrace() {},
  state: { bootDismissed: true, panelOpen: true, localMemory: "prompt", entryAccessMode: "first", windowSteady: true },
  minimizedRecordWindow: { id: "old" }, recordRenderPending: false,
  root: { querySelector: (selector) => nodes.get(selector) || null },
  syncSearchPanel() {}, syncRoadmapDialog() {}, selectedRecord: () => ({ id: "new" }),
  recordBackdrop: () => "backdrop", recordWindow: (record) => record.id,
  timelineWindow: () => "timeline", syncDesktopNavigation: () => navigationSyncs++, syncRecordFocus: () => focusSyncs++,
  render: () => renders++, localMemoryPrompt: () => "consent", stopRecordAccessSequence: () => stopped++,
  recordMotionController: { busy: false, close: ({ onComplete }) => { completion = onComplete; } }, bootCleanup: () => {},
});
vm.runInContext(functions, context);
node(".record-window"); node("[data-record-backdrop]");
assert.equal(vm.runInContext("syncRecordWindow()", context), true);
assert.equal(workspace.inserted.html, "backdropnew");
assert.equal(nodes.get(".grain-layer"), background);
assert.equal(nodes.get(".dashboard-grid"), dashboard);

assert.equal(dashboard.scrollTop, 146, "Window updates preserve section scroll and actual dashboard nodes");
assert.equal(context.minimizedRecordWindow, null);
assert.equal(context.state.windowSteady, false, "The transient tab-change flag cannot suppress a later opening");
assert.equal(focusSyncs, 1);
assert.equal(navigationSyncs, 1);
assert.ok(dashboard.classList.values.has("is-muted"));
assert.equal(renders, 0);

const nested = node(".archive-nav-panel");
assert.equal(vm.runInContext("syncRecordWindow()", context), false, "The open mobile menu keeps its existing record-opening fallback");
nested.remove();
node(".record-window"); node("[data-record-backdrop]");
vm.runInContext("closeRecord()", context);
assert.ok(nodes.has(".record-window"), "Closing remains content-first until shared motion completes");
completion();
assert.equal(context.state.panelOpen, false);
assert.equal(stopped, 1);
assert.equal(renders, 0, "Ordinary close never repaints the page through a root replacement");
assert.ok(!nodes.has(".record-window") && !nodes.has("[data-record-backdrop]"));
assert.ok(!dashboard.classList.values.has("is-muted"));
context.state.panelOpen = true;
context.recordRenderPending = true;
vm.runInContext("closeRecord()", context); completion();
assert.equal(renders, 1, "A real data refresh deferred during exit still runs");

shell.inert = true;
shell.classList.values.add("is-booting");
shell.classList.values.add("is-quick-boot");
node(".boot-screen");
vm.runInContext("completeBoot()", context);
assert.equal(renders, 1, "Boot handoff does not rebuild the already-revealed workspace");
assert.equal(shell.inert, false);
assert.equal(shell.removedAttribute, "aria-busy");
assert.equal(shell.removedStyle, "--boot-elapsed");
assert.equal(shell.classList.values.size, 0);
assert.equal(shell.inserted.html, "consent", "Consent still appears only after boot");
assert.equal(context.bootCleanup, null);
assert.ok(!nodes.has(".boot-screen"));
node(".local-memory-consent");
context.state.localMemory = "session";
vm.runInContext("completeBoot()", context);
assert.ok(!nodes.has(".local-memory-consent"));
assert.equal(nodes.get(".dashboard-grid"), dashboard);

let settingsHandlers, nativeSettingsOpen = false, settingsDestroyed = 0;
context.window.GestaltOsBehaviour = { createController: () => ({
  open(values, handlers) { nativeSettingsOpen = true; settingsHandlers = handlers; },
  destroy() { nativeSettingsOpen = false; settingsDestroyed++; }
}) };
context.osBehaviourController = null;
context.state.panelOpen = false;
context.state.searchOpen = true;
context.state.searchQuery = "settings";
const beforeSettingsRenders = renders;
const retainedMemory = node(".memory-trace");
vm.runInContext("openOsBehaviour()", context);
assert.equal(nativeSettingsOpen, true);
assert.equal(context.state.searchOpen, false);
assert.ok(shell.classList.values.has("has-record") && workspace.classList.values.has("has-record"));
assert.equal(renders, beforeSettingsRenders, "Settings opens without replacing the workspace");
settingsHandlers.onClose();
assert.equal(nativeSettingsOpen, false);
assert.equal(settingsDestroyed, 1);
assert.equal(context.osBehaviourController, null);
assert.ok(!shell.classList.values.has("has-record") && !workspace.classList.values.has("has-record"));
assert.equal(renders, beforeSettingsRenders, "Settings close never rebuilds the dashboard");
assert.equal(nodes.get(".memory-trace"), retainedMemory);
assert.equal(nodes.get(".grain-layer"), background);
assert.equal(dashboard.scrollTop, 146);
context.state.panelOpen = true;
const focusedRecord = node(".record-window:not([hidden]):not([inert]), .timeline-window, .archive-folder-window");
focusedRecord.focus = () => { focusedRecord.focused = true; };
vm.runInContext("openOsBehaviour()", context); settingsHandlers.onClose();
assert.ok(shell.classList.values.has("has-record"), "A record underneath Settings keeps its focus scrim");
assert.equal(focusedRecord.focused, true, "Closing Settings returns keyboard focus to the retained record");
focusedRecord.remove();
context.state.navOpen = true;
vm.runInContext("openOsBehaviour()", context);
assert.equal(renders, beforeSettingsRenders + 1, "Mobile navigation retains its existing dismissal/render fallback");

const beforeTimelineRenders = renders;
context.state.osBehaviourOpen = false;
context.state.panelOpen = false;
context.state.panelMinimized = true;
context.minimizedRecordWindow = { node: node(".record-window") };
vm.runInContext("openTimeline()", context);
assert.equal(context.state.timelineSource, "all");
assert.equal(workspace.inserted.html, "timeline");
assert.equal(context.minimizedRecordWindow, null);
assert.equal(restoreNode.hidden, true);
assert.ok(!nodes.has(".record-window"));
assert.ok(shell.classList.values.has("has-record"));
const timeline = node(".timeline-window"), timelineBackdrop = node("[data-timeline-close]");
workspace.inserted = null;
vm.runInContext("openTimeline()", context);
assert.equal(workspace.inserted, null, "Reopening an active timeline must not replay its entrance or reset the filter");
assert.equal(nodes.get(".timeline-window"), timeline);
vm.runInContext("closeTimeline()", context);
assert.ok(!nodes.has(".timeline-window") && !nodes.has("[data-timeline-close]"), "Closing removes the timeline and its click shield together");
assert.ok(!shell.classList.values.has("has-record"));
assert.equal(nodes.get(".workspace-window-tray"), trayNode);
assert.equal(trayNode.outerHTML, undefined, "Window changes retain terminal/notice controls");
assert.equal(nodes.get(".dashboard-grid"), dashboard);
assert.equal(dashboard.scrollTop, 146);
nodes.set(".timeline-window", timeline);
nodes.set("[data-timeline-close]", timelineBackdrop);
context.state.panelOpen = true;
assert.equal(vm.runInContext("syncRecordWindow()", context), true);
assert.ok(!nodes.has(".timeline-window") && !nodes.has("[data-timeline-close]"), "Opening a timeline result removes its old backdrop and mounts the entry in place");
assert.equal(workspace.inserted.html, "backdropnew");
assert.equal(renders, beforeTimelineRenders);
context.recordMotionController.busy = true;
vm.runInContext("openTimeline()", context);
assert.equal(renders, beforeTimelineRenders + 1, "Timeline opening keeps the busy-transition fallback");

const beforeRoadmapRenders = renders, roadmapVisibility = [];
let roadmapLoads = 0;
Object.assign(context, { roadmapChapterId: "done", roadmapReleaseIndex: 1, refreshPublicRoadmap: () => roadmapLoads++,
  syncRoadmapDialog() { roadmapVisibility.push(context.state.roadmapOpen); } });
vm.runInContext("openRoadmap()", context);
assert.equal(roadmapLoads, 0, "An outgoing record animation cannot open a competing modal");
context.recordMotionController.busy = false;
node(".timeline-window"); node("[data-timeline-close]");
context.state.searchOpen = true; context.state.searchQuery = "roadmap";
vm.runInContext("openRoadmap(); openRoadmap()", context);
assert.equal(roadmapLoads, 1);
assert.equal(context.roadmapChapterId, "working");
assert.equal(context.roadmapReleaseIndex, null);
assert.equal(context.state.searchOpen, false);
assert.equal(context.state.timelineOpen, false);
assert.ok(!nodes.has(".timeline-window") && !nodes.has("[data-timeline-close]"));
assert.ok(shell.classList.values.has("has-record"));
vm.runInContext("closeRoadmap(); closeRoadmap()", context);
assert.deepEqual(roadmapVisibility, [true, false]);
assert.ok(!shell.classList.values.has("has-record"));
assert.equal(nodes.get(".dashboard-grid"), dashboard);
assert.equal(nodes.get(".memory-trace"), retainedMemory);
assert.equal(nodes.get(".workspace-window-tray"), trayNode);
assert.equal(dashboard.scrollTop, 146);
assert.equal(renders, beforeRoadmapRenders, "Roadmap open/close retains the real workspace, stream and scroll");

const archivePage = node(".workspace > .archive-folder-page"), archiveIndex = node(".archive-root-files");
archiveIndex.scrollTop = 190;
archivePage.querySelector = (selector) => selector === ":scope > .archive-folder-overlay" ? nodes.get(".archive-folder-overlay") : null;
archivePage.insertAdjacentHTML = (where, html) => { assert.equal(where, "beforeend"); node(".archive-folder-overlay").html = html; };
let folderBuilds = 0;
Object.assign(context, { directoryArchiveDay: new Date().toISOString().slice(0, 10), recordsFor: (section) => { assert.equal(section, "logs"); return []; },
  buildFieldArchive() { folderBuilds++; return { folders: [] }; }, renderArchiveFolderWindow() { return context.state.archiveFolderWindow; } });
vm.runInContext('openArchiveFolder("07/2026")', context);
const firstFolder = nodes.get(".archive-folder-overlay");
assert.equal(firstFolder.html, "07/2026");
assert.ok(archivePage.classList.values.has("has-folder-window"));
vm.runInContext('openArchiveFolder("07/2026")', context);
assert.equal(nodes.get(".archive-folder-overlay"), firstFolder);
vm.runInContext('openArchiveFolder("08/2026"); closeArchiveFolder()', context);
assert.equal(folderBuilds, 2, "Closing and selecting the active folder do not regroup records");
assert.ok(!nodes.has(".archive-folder-overlay") && !archivePage.classList.values.has("has-folder-window"));
for (const action of ["syncRecordWindow", "openTimeline", "openRoadmap"]) {
  Object.assign(context.state, { panelOpen: false, timelineOpen: false, roadmapOpen: false });
  vm.runInContext(`openArchiveFolder("07/2026"); state.archiveFolderWindow = null; ${action}()`, context);
  assert.ok(!nodes.has(".archive-folder-overlay") && !archivePage.classList.values.has("has-folder-window"), `${action} removes the nested window and its scrim in place`);
}
assert.equal(nodes.get(".workspace > .archive-folder-page"), archivePage);
assert.equal(nodes.get(".archive-root-files"), archiveIndex);
assert.equal(archiveIndex.scrollTop, 190);
assert.equal(renders, beforeRoadmapRenders, "Folder transitions and handoffs never rebuild the index or shell");
context.directoryArchiveDay = "2020-01-01";
vm.runInContext('openArchiveFolder("07/2026")', context);
assert.equal(renders, beforeRoadmapRenders + 1, "UTC rollover refreshes the folder partition and the index together");

const sections = [{ id: "system", code: "01_SYSTEM", label: "Dashboard" }, { id: "projects", code: "02_PROJECTS", label: "Active Processes" }];
const routeElements = new Map(), events = [];
const element = (selector, children = {}) => {
  const value = {
    attrs: new Map(), classList: classes(), isConnected: true, dataset: {},
    querySelector: (key) => children[key],
    setAttribute(key, text) { this.attrs.set(key, text); }, removeAttribute(key) { this.attrs.delete(key); },
    remove() { this.isConnected = false; routeElements.delete(selector); if (document.activeElement === this || this.contains?.(document.activeElement)) document.activeElement = document.body; },
    focus() { document.activeElement = this; }
  };
  if (selector) routeElements.set(selector, value);
  return value;
};
const document = { body: {}, activeElement: null };
const oldTitle = element(), oldContent = element(), newTitle = element(), clock = element(), tray = element(), marker = element(), menuCode = element();
const routeHeader = { firstElementChild: oldTitle, clock };
const restore = element(), menuButton = element("[data-nav-toggle]", { ".archive-menu-code": menuCode });
const shellRoute = element(".archive-shell"), sidebar = element(".sidebar"), footer = element(".workspace-footer"), grain = element(".grain-layer");
const menu = element(".archive-nav-panel"), menuItem = element();
menu.contains = (item) => item === menuItem;
element("[data-nav-backdrop]");
const windows = [element(), element(), element()];
const routeWorkspace = element(".workspace", { ".workspace-header": routeHeader, ":scope > :is(.dashboard-grid, .section-page)": oldContent, ".reopen-control": restore, ".workspace-header h1": newTitle });
routeWorkspace.querySelectorAll = () => windows.filter((item) => item.isConnected);
routeWorkspace.tray = tray;
const rail = element(".nav-stack--sidebar");
rail.style = new Map(); rail.style.setProperty = rail.style.set.bind(rail.style);
const home = element(), project = element(), directory = element(null, { ".desktop-directory-marker": marker });
project.dataset.openSection = directory.dataset.openSection = "projects";
let fallback = 0;
const route = vm.createContext({
  root: { querySelector: (key) => routeElements.get(key), querySelectorAll: () => [home, project, directory] }, document, sections,
  state: { activeSection: "system", bootDismissed: true, panelMinimized: true, searchOpen: true, searchQuery: "a", navOpen: true, archiveFolderWindow: "older", roadmapOpen: true },
  window: { GestaltMemoryState: { record: (name, data) => events.push([name, data.section]) }, clearTimeout() {}, scrollY: 92, scrollTo(options) { assert.equal(options.top, 0); this.scrollY = 0; } },
  directoryArchiveDay: new Date().toISOString().slice(0, 10), navMotionTimer: 7, minimizedRecordWindow: { node: windows[0] },
  recordMotionController: { busy: false },
  stopRecordAccessSequence() {}, render: () => fallback++, workspaceContent: () => `content:${route.state.activeSection}`,
  greeting: () => "Good morning.", dashboardSubtext: () => "Daily note", escapeHtml: String, renderHeadlineLetters: String,
  syncRoadmapDialog() { assert.equal(route.state.roadmapOpen, false); }, syncWorkspaceFocus() {}, syncSearchPanel() { assert.equal(route.state.searchOpen, false); }, syncRecordFocus() {},
  syncMemoryMotion: () => events.push("legacy sync"), syncMemoryTrace: () => events.push("trace sync")
});
vm.runInContext(functions, route);
document.activeElement = menuItem;
vm.runInContext('openSection("projects")', route);
assert.equal(fallback, 0);
assert.match(oldTitle.outerHTML, /02_PROJECTS.*\s+<h1 class="headline-decode-text is-resolving"/);
assert.equal(oldContent.outerHTML, "content:projects");
for (const [selector, value] of [[".archive-shell", shellRoute], [".workspace", routeWorkspace], [".sidebar", sidebar], [".workspace-footer", footer], [".grain-layer", grain]]) assert.equal(routeElements.get(selector), value);
assert.equal(routeHeader.clock, clock);
assert.equal(routeWorkspace.tray, tray);
assert.ok(windows.every((item) => !item.isConnected));
assert.equal(route.minimizedRecordWindow, null);
assert.equal(restore.hidden, true);
assert.equal(route.state.archiveFolderWindow, null);
assert.equal(route.state.searchQuery, "");
assert.equal(route.state.headlineAnimating, false);
assert.equal(route.navMotionTimer, 0);
assert.equal(routeWorkspace.scrollTop, 0);
assert.equal(route.window.scrollY, 0);
assert.equal(menuButton.attrs.get("aria-expanded"), "false");
assert.equal(menuCode.textContent, "02_PROJECTS");
assert.equal(document.activeElement, menuButton, "Closing the menu retains a visible navigation focus target");
assert.equal(project.attrs.get("aria-current"), "page");
assert.ok(project.classList.values.has("is-active"));
assert.equal(directory.attrs.get("aria-current"), "page");
assert.equal(marker.textContent, ">");
assert.equal(rail.style.get("--active-nav-index"), "1");
vm.runInContext('openSection("projects"); openHome()', route);
assert.deepEqual(events, [["section.enter", "projects"], "legacy sync", "trace sync", ["section.enter", "system"], "legacy sync", "trace sync"]);
assert.equal(oldContent.outerHTML, "content:system");
assert.equal(home.attrs.get("aria-current"), "page");
assert.equal(project.attrs.has("aria-current"), false);
assert.equal(marker.textContent, "-");
route.recordMotionController.busy = true;
vm.runInContext('openSection("projects")', route);
route.recordMotionController.busy = false;
route.directoryArchiveDay = "2020-01-01";
vm.runInContext("openHome()", route);
assert.equal(fallback, 2, "Busy record motion and stale directory dates retain the full-render path");

const css = read("app/globals.css");
assert.match(css, /\.grain-layer,\s*\.scanline-layer\s*\{[^}]*transform: translateZ\(0\)/, "Only the static texture overlays get cached layers");
assert.match(css, /\.record-window::after\s*\{[^}]*transform: translateZ\(0\)/, "The open window's static scanline overlay is cached too, not its whole descendant tree");
const react = read("components/archive/record-window.tsx");
assert.ok(!react.includes("motion.article") && !react.includes('from "framer-motion"'), "React and Pages use the same CSS entry fade, not two competing opacity animations");
assert.equal((react.match(/<article\s+ref=/g) || []).length, 2, "Standard and Setup dialogs retain their real roots");
assert.match(source, /if \(!syncRecordWindow\(\)\) render\(\);\s*startRecordAccessSequence\(\)/);
let contentBranch;
function findContentBranch(node) {
  if (ts.isIfStatement(node) && node.expression.getText(ast) === "contentKey") contentBranch = node.thenStatement;
  ts.forEachChild(node, findContentBranch);
}
findContentBranch(ast);
assert.ok(contentBranch?.getText(ast).includes("if (!syncRecordWindow()) render();"), "Content-tab changes use the same retained-workspace path");
assert.ok(!read("index.html").includes("performance-probe"), "The opt-in probe is never part of the public reader");
assert.ok(!read("scripts/prepare-pages.mjs").includes("performance-preview"));
const readerAst = ts.createSourceFile("archive-os.tsx", read("components/archive-os.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
for (const name of ["closeRecord", "minimizeRecord"]) {
  let action;
  function findAction(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(readerAst) === name) action = node.initializer;
    ts.forEachChild(node, findAction);
  }
  findAction(readerAst); assert.ok(action);
  const script = ts.transpileModule(`(${action.getText(readerAst)})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const surface of [null, { hidden: true }, { hidden: false }]) {
    let started = 0;
    const motion = { close({ node }) { assert.equal(node, surface); started++; }, minimize({ node }) { assert.equal(node, surface); started++; } };
    vm.runInNewContext(script, { inlineBusy: false, panelOpen: true, shellRef: { current: { querySelector: () => surface } }, recordMotionRef: { current: motion }, entryAccessModeRef: { current: "first" } });
    assert.equal(started, surface && !surface.hidden ? 1 : 0, `${name} ignores missing/hidden DOM even before React commits its closed state`);
  }
}
console.log("Transition lifecycle passed: retained workspace/scroll, single fade, delayed close, deferred refresh, focus sync and consent-safe boot handoff.");
