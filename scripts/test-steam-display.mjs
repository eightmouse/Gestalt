import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import imageFraming from "../public/image-framing.js";
import { createSteamSnapshotLoader, currentGameCover, publicSnapshot, resolveCurrentGame, steamBannerImage, steamCoverUrl, steamRecordSeed } from "../public/steam-display.mjs";

const now = "2026-10-20T12:00:00.000Z";
const snapshot = { schemaVersion: 1, updatedAt: now, game: { appId: 2, title: "Latest <Game>", playtimeMinutes: 123, lastPlayedAt: now, achievements: { unlocked: 1, total: 4 } } };
const reactRecords = [
  { id: "manual", section: "games", title: "Manual Game", status: "Playing", progress: 42, meta: {} },
  { id: "matched", section: "games", title: "Authored title", status: "Filed", progress: 100, meta: { steamAppId: "2", playtime: "older" } }
];
const staticRecords = reactRecords.map(({ meta, ...record }) => ({ ...record, ...meta }));
const before = JSON.stringify(reactRecords);
assert.deepEqual(resolveCurrentGame(snapshot, reactRecords), resolveCurrentGame(snapshot, staticRecords));
const display = resolveCurrentGame(snapshot, reactRecords);
assert.equal(display.recordId, "matched");
assert.equal(display.completion, "25% Achievements");
assert.equal(display.playtime, "2.0h");
assert.equal(display.lastPlayed, "20 / 10 / 2026");
assert.equal(JSON.stringify(reactRecords), before, "Resolving stats never changes authored records");
assert.equal(resolveCurrentGame(snapshot, []).recordId, undefined, "Unwritten games may display without an entry action");
assert.equal(resolveCurrentGame(null, reactRecords).recordId, "manual");
assert.equal(resolveCurrentGame({ ...snapshot, schemaVersion: 999 }, reactRecords).recordId, "manual");
assert.equal(resolveCurrentGame(null, []), null);
assert.equal(resolveCurrentGame(null, reactRecords).playtime, null, "No fabricated playtime");
assert.equal(resolveCurrentGame(null, reactRecords).lastPlayed, null, "No fabricated Today");
assert.equal(resolveCurrentGame({ ...snapshot, game: { ...snapshot.game, achievements: null, playtimeMinutes: null } }, []).completion, null);
const pinnedRecords = reactRecords.map((record) => ({ ...record, meta: { ...record.meta, dashboardActive: record.id === "manual" } }));
const pinnedBefore = JSON.stringify(pinnedRecords);
const pin = resolveCurrentGame(snapshot, pinnedRecords);
assert.equal(pin.recordId, "matched", "Legacy pins cannot override automatic game selection");
assert.equal(pin.source, "steam");
assert.equal(pin.completion, "25% Achievements");
assert.equal(pin.playtime, "2.0h");
assert.equal(pin.lastPlayed, "20 / 10 / 2026");
assert.deepEqual(pin, resolveCurrentGame(snapshot, pinnedRecords.map(({ meta, ...record }) => ({ ...record, ...meta }))), "Flat Pages pins match nested React pins");
assert.equal(resolveCurrentGame(null, pinnedRecords).recordId, "manual", "Unavailable data retains the authored Playing fallback");
const stalePin = pinnedRecords.map((record) => ({ ...record, meta: { ...record.meta, dashboardActive: record.id === "matched" } }));
assert.equal(resolveCurrentGame(null, stalePin).recordId, "manual", "Fallback also ignores legacy pins");
const matchingPin = pinnedRecords.map((record) => ({ ...record, meta: { ...record.meta, dashboardActive: record.id === "matched" } }));
assert.deepEqual(resolveCurrentGame(snapshot, matchingPin), display, "A matching pin still receives Steam hours and achievements");
assert.deepEqual(resolveCurrentGame(snapshot, reactRecords), display, "Unpinning restores automatic selection without rewriting records");
assert.equal(JSON.stringify(pinnedRecords), pinnedBefore, "Selection does not mutate pin, placement, notes or authored stats");
const unavailableStats = { ...snapshot, game: { ...snapshot.game, achievements: null, playtimeMinutes: null } };
assert.equal(resolveCurrentGame(unavailableStats, matchingPin).completion, null, "Unavailable achievements are not replaced with authored story completion");
assert.equal(resolveCurrentGame(unavailableStats, matchingPin).playtime, null);
const falsePin = [{ ...reactRecords[0], meta: { dashboardActive: "true" } }, reactRecords[1]];
assert.equal(resolveCurrentGame(snapshot, falsePin).recordId, "matched", "Only a true boolean enables pinning");
assert.equal(steamCoverUrl("../../elsewhere"), null);
assert.equal(steamCoverUrl(0), null);
assert.match(steamCoverUrl(2), /^https:\/\/shared\.fastly\.steamstatic\.com\//);
const headerOnlyGame = { id: "matched", headerImage: "/media/entry-header.webp", steamAppId: 2 };
assert.equal(currentGameCover(headerOnlyGame, 2), headerOnlyGame.headerImage, "A header-only game uses its saved artwork");
assert.equal(currentGameCover({ meta: headerOnlyGame }, 2), headerOnlyGame.headerImage, "Nested local and flat public fields match");
assert.equal(currentGameCover({ ...headerOnlyGame, banner: "/banner.webp" }, 2), "/banner.webp");
assert.equal(currentGameCover({ ...headerOnlyGame, banner: "/banner.webp", dashboardImage: "/cover.webp" }, 2), "/cover.webp");
assert.equal(currentGameCover({ meta: { steamAppId: "2" } }), steamCoverUrl(2), "An App ID can supply a portrait when no artwork was saved");
assert.equal(currentGameCover(undefined, 2), steamCoverUrl(2));
assert.equal(currentGameCover({ steamAppId: "../../elsewhere" }), null);
assert.equal(steamBannerImage(steamCoverUrl(39210)), "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/39210/header.jpg");
for (const cover of [undefined, "/media/custom-cover.webp", "https://example.test/library_600x900.jpg", steamCoverUrl(2) + "?custom=1", "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4294967296/library_600x900.jpg"]) {
  assert.equal(steamBannerImage(cover), null, "Only recognized automatic Steam portraits get alternate artwork");
}
assert.equal(steamRecordSeed(display), null, "Existing game records never offer creation");
assert.equal(steamRecordSeed(resolveCurrentGame(null, reactRecords)), null);
assert.equal(steamRecordSeed(null), null);
const seed = steamRecordSeed(resolveCurrentGame(snapshot, []));
assert.deepEqual(seed, { title: "Latest <Game>", steamAppId: "2", banner: steamCoverUrl(2) });
assert.equal(steamRecordSeed({ source: "steam", title: "Bad ID", coverAppId: "../evil" }), null);

let calls = 0;
const loader = createSteamSnapshotLoader(async (url, options) => {
  calls += 1;
  assert.equal(url, "https://example.test/Gestalt/public/data/steam-current.json");
  assert.equal(options.cache, "no-cache");
  assert.equal(options.redirect, "error");
  return Response.json(snapshot);
});
const url = "https://example.test/Gestalt/public/data/steam-current.json";
const results = await Promise.all([loader(url), loader(url), loader(url)]);
assert.equal(calls, 1, "Strict Mode and navigation do not repeat the fetch");
assert.deepEqual(results[0], publicSnapshot(snapshot));
for (const response of [new Response("missing", { status: 404 }), new Response("<html>fallback</html>"), new Response("{}", { headers: { "Content-Type": "application/json" } }), new Response("x".repeat(33 * 1024), { headers: { "Content-Type": "application/json" } })]) {
  const failed = createSteamSnapshotLoader(async () => response);
  assert.equal(await failed(url), null);
}
const offline = createSteamSnapshotLoader(async () => { throw new Error("Offline"); });
assert.equal(await offline(url), null);
assert.equal(await offline(url), null);

function declaration(file, name) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  return ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast);
}

const require = createRequire(import.meta.url);
const component = ts.transpileModule(`export ${declaration("../components/archive/dashboard.tsx", "CurrentGame")}`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const react = vm.createContext({ exports: {}, require, imageFraming, steamBannerImage, currentGameCover, FilePlus2: require("lucide-react").FilePlus2, dashboardRecordStateKey: () => "playing" });
vm.runInContext(component, react);
const staticContext = vm.createContext({
  window: { GestaltImageFraming: imageFraming },
  steamDisplayModule: { steamBannerImage, currentGameCover },
  steamDisplayReady: true,
  currentGameRecord: () => headerOnlyGame,
  currentGameDisplay: () => display,
  recordStateKey: () => "playing"
});
for (const name of ["escapeHtml", "dashboardPanel", "currentGamePanel"]) vm.runInContext(declaration("../static-app.js", name), staticContext);
for (const model of [display, { ...display, completion: null, playtime: null, lastPlayed: null }]) {
  staticContext.currentGameDisplay = () => model;
  const reactHtml = renderToStaticMarkup(react.exports.CurrentGame({ display: model, record: { ...reactRecords[1], meta: headerOnlyGame } }));
  const staticHtml = vm.runInContext("currentGamePanel()", staticContext);
  for (const html of [reactHtml, staticHtml]) {
    assert.ok(html.includes("Latest &lt;Game&gt;"), "Game titles are escaped");
    assert.ok(html.includes(headerOnlyGame.headerImage), "Both dashboards render the existing header, not a generic placeholder");
    assert.equal(html.includes("25% Achievements"), Boolean(model.completion));
    assert.equal(html.includes("2.0h Play Time"), Boolean(model.playtime));
    assert.equal(html.includes("Last Played: 20 / 10 / 2026"), Boolean(model.lastPlayed));
    assert.equal(html.includes("18.7h"), false);
    assert.equal(html.includes("Today"), false);
  }
}
assert.match(vm.runInContext("currentGamePanel()", staticContext), /data-open-record="matched" data-open-content="notes"/);
staticContext.steamDisplayModule = { steamBannerImage };
assert.ok(vm.runInContext("currentGamePanel()", staticContext).includes(headerOnlyGame.headerImage), "An older cached Steam helper cannot hide the cover");
staticContext.steamDisplayModule = { steamBannerImage, currentGameCover };
staticContext.currentGameRecord = () => undefined;
assert.equal(vm.runInContext("currentGamePanel()", staticContext).includes("data-open-record"), false);
staticContext.steamDisplayReady = false;
staticContext.currentGameDisplay = () => null;
assert.match(vm.runInContext("currentGamePanel()", staticContext), /Reading Steam snapshot/);
staticContext.steamDisplayReady = true;
assert.match(vm.runInContext("currentGamePanel()", staticContext), /No session active/);
const startup = vm.createContext({ steamDisplayReady: false, steamDisplaySnapshot: null, steamDisplayModule: { resolveCurrentGame }, recordsFor: () => staticRecords });
for (const name of ["currentGameRecord", "currentGameDisplay"]) vm.runInContext(declaration("../static-app.js", name), startup);
assert.equal(startup.currentGameRecord(), undefined, "No old authored game while the snapshot is pending");
assert.equal(startup.currentGameDisplay(), null);
startup.steamDisplayReady = true;
assert.equal(startup.currentGameRecord().id, "manual", "Offline completion retains the authored fallback");
startup.steamDisplaySnapshot = snapshot;
assert.equal(startup.currentGameRecord().id, "matched");
const unmatchedDisplay = resolveCurrentGame(snapshot, []);
assert.equal(renderToStaticMarkup(react.exports.CurrentGame({ display: unmatchedDisplay })).includes("Create game record"), false, "Public readers do not offer editing");
assert.ok(renderToStaticMarkup(react.exports.CurrentGame({ display: unmatchedDisplay, onCreate() {} })).includes("Create game record"), "Local readers can offer deliberate creation");
assert.ok(renderToStaticMarkup(react.exports.CurrentGame({ display: unmatchedDisplay })).includes("is-steam-artwork"));
vm.runInContext(declaration("../static-app.js", "recordBanner"), staticContext);
const bannerComponent = ts.transpileModule(`export ${declaration("../components/archive/record-content.tsx", "RecordBanner")}`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInContext(`(() => { ${bannerComponent} })()`, react);
for (const banner of [steamCoverUrl(39210), "/media/custom.webp"]) {
  const record = { section: "games", banner };
  staticContext.bannerRecord = record;
  const reactBanner = renderToStaticMarkup(react.exports.RecordBanner({ record }));
  const staticBanner = vm.runInContext("recordBanner(bannerRecord)", staticContext);
  for (const html of [reactBanner, staticBanner]) {
    assert.equal(html.includes("banner-frame--steam"), Boolean(steamBannerImage(banner)));
    assert.ok(html.includes(steamBannerImage(banner) || banner));
  }
}

const frame = { bannerFit: "cover", bannerZoom: 125, bannerX: 40, bannerY: 60 };
assert.deepEqual(imageFraming.imageFrameFields(frame), frame);
assert.equal(imageFraming.imageFrameStyle(null), undefined, "Unconfigured records retain their original CSS framing");
assert.equal(imageFraming.imageFrameCss({ bannerFit: 'url("javascript:bad")', bannerZoom: Infinity, bannerX: "50%;color:red", bannerY: {} }), "");
assert.deepEqual(imageFraming.normalizeImageFrame({ bannerZoom: 10000, bannerX: -10, bannerY: 200 }), { bannerFit: "", bannerZoom: 200, bannerX: 0, bannerY: 100 });
assert.equal(imageFraming.headerFrameStyle(frame), undefined, "Existing overview framing never changes the title background");
assert.equal(imageFraming.headerFrameCss({ headerZoom: Infinity, headerX: "50%;color:red", headerY: {} }), "");
assert.equal(imageFraming.headerFrameStyle(null), undefined, "Old records keep their exact CSS header crop");
assert.deepEqual(imageFraming.normalizeHeaderFrame({ headerZoom: 1, headerX: -10, headerY: 900 }), { headerZoom: 100, headerX: 0, headerY: 100 });
assert.deepEqual(imageFraming.headerFrameFields({ headerZoom: 999, headerX: "40", headerY: 60 }), { headerZoom: 200, headerX: 40, headerY: 60 });
const headerStyle = imageFraming.headerFrameStyle({ ...frame, headerZoom: 135, headerX: 20, headerY: 75 });
assert.equal(headerStyle.transform, "scale(1.35)");
assert.equal(headerStyle.objectPosition, "20% 75%");
assert.equal(headerStyle["--header-image-scale"], "1.35", "The entry animation settles to the saved header scale");
assert.deepEqual(imageFraming.headerFrameFields(imageFraming.normalizeHeaderFrame(null)), {}, "Default reset adds no metadata");
staticContext.bannerRecord = { section: "games", banner: steamCoverUrl(39210), ...frame };
const framedStaticHtml = vm.runInContext("recordBanner(bannerRecord)", staticContext);
const framedReactHtml = renderToStaticMarkup(react.exports.RecordBanner({ record: { section: "games", banner: steamCoverUrl(39210), meta: frame } }));
for (const html of [framedStaticHtml, framedReactHtml]) assert.ok(html.includes("object-fit:cover;object-position:40% 60%;transform:scale(1.25);transform-origin:40% 60%"), "Both readers use the same bounded frame");

const steamCover = steamCoverUrl(39210);
const landscape = steamBannerImage(steamCover);
const legacyGame = { id: "legacy-game", title: "Legacy game", section: "games", type: "Play Log", status: "Active", priority: 1, updated: now, banner: steamCover, body: "", milestones: [], meta: {} };
assert.deepEqual(imageFraming.recordHeadingArtwork(legacyGame, steamBannerImage), { src: landscape, coverFallback: steamCover });
assert.deepEqual(imageFraming.recordHeadingArtwork({ ...legacyGame, banner: "/media/legacy.webp" }), { src: "/media/legacy.webp", coverFallback: "" });
assert.deepEqual(imageFraming.recordHeadingArtwork({ ...legacyGame, meta: { headerImage: "/media/custom.webp" } }, steamBannerImage), { src: "/media/custom.webp", coverFallback: "" });
assert.equal(imageFraming.recordHeadingArtwork({ ...legacyGame, section: "projects" }, steamBannerImage), null, "Only games promote legacy banners");

Object.assign(react, {
  useState: (value) => [value, () => {}], useEffect() {}, useRef: () => ({ current: null }),
  motion: { article: ({ children }) => require("react").createElement("article", null, children) },
  getRecordContents: () => [],
  recordStateKey: () => "active", formatReadableDate: (value) => value,
  gameLogPlacement: () => "session", gameActivityValue: () => "",
  RecordAccessSurface: () => null, RecordContentPanel: () => null, UpdateHistory: () => null,
  Maximize2: require("lucide-react").Maximize2, Minimize2: require("lucide-react").Minimize2, X: require("lucide-react").X, Settings: require("lucide-react").Settings
});
const headerComponent = ts.transpileModule(`${declaration("../components/archive/record-window.tsx", "useRecordFocus")}\nexport ${declaration("../components/archive/record-window.tsx", "ArchiveRecordWindow")}`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInContext(`(() => { ${headerComponent} })()`, react);
Object.assign(staticContext, {
  state: { panelOpen: true }, getRecordContents: () => [], normalizeContentKey: () => "overview",
  recordHeaderImage: (record) => record.headerImage || "", recordAccessSurfaceMarkup: () => "", renderRecordContent: () => "",
  renderUpdateHistory: () => "", renderUpdateHistoryModal: () => "", readableDate: (value) => value,
  gameLogPlacement: () => "session", gameActivityValue: () => ""
});
vm.runInContext(declaration("../static-app.js", "recordWindow"), staticContext);
function findHeaderElement(node, className) {
  if (!node || typeof node !== "object") return null;
  if (node.props?.className === className) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = findHeaderElement(child, className);
    if (found) return found;
  }
  return null;
}
for (const section of ["projects", "games", "logs"]) {
  const headerFrame = { headerZoom: 135, headerX: 20, headerY: 75 };
  const record = { id: "header-fixture", title: "Header <fixture>", section, type: "Record", status: "Active", priority: 1, updated: "2026-10-27", body: "", meta: { headerImage: "/media/header.png", ...frame, ...headerFrame } };
  staticContext.headerRecord = { ...record, ...record.meta };
  const reactHeader = renderToStaticMarkup(react.exports.ArchiveRecordWindow({ record, initialContent: "overview", maximized: false }));
  const staticHeader = vm.runInContext("recordWindow(headerRecord)", staticContext);
  let editedContent;
  const localHeader = react.exports.ArchiveRecordWindow({ record, initialContent: "overview", maximized: false, onEdit: (content) => { editedContent = content; } });
  assert.equal(findHeaderElement(findHeaderElement(localHeader, "window-title-group"), "window-edit-action"), null, "The title is not an editing toolbar");
  const controls = findHeaderElement(localHeader, "window-control-group");
  const gear = findHeaderElement(controls, "window-edit-action");
  assert.ok(gear && findHeaderElement(controls, "window-actions"), `${section} places the gear beside window controls`);
  gear.props.onClick(); assert.equal(editedContent, "overview", "Moving the gear retains the active-content edit action");
  assert.equal(gear.props["aria-label"], "Edit this record locally");
  assert.ok(!reactHeader.includes("window-edit-action"), "Public/readonly entries gain no edit control");
  for (const html of [reactHeader, staticHeader]) {
    assert.ok(html.includes(imageFraming.headerFrameCss(headerFrame)), "React and Pages render the saved header crop, not overview framing");
    assert.ok(html.includes("Header &lt;fixture&gt;"));
  }
}
const tabs = ["overview", "notes", "recommendation"];
react.getRecordContents = staticContext.getRecordContents = () => tabs.map(key => ({ key, label: key }));
react.contentOrdinal = staticContext.contentOrdinal = () => "01";
react.NoteSearchBox = () => null;
staticContext.renderNoteSearch = () => "";
staticContext.normalizeContentKey = () => staticContext.state.activeContent;
staticContext.headerRecord = { ...legacyGame, meta: undefined };
for (const tab of tabs) {
  staticContext.state.activeContent = tab;
  const local = react.exports.ArchiveRecordWindow({ record: legacyGame, initialContent: tab, maximized: false });
  const image = findHeaderElement(local, "heading-banner-image");
  assert.equal(image?.props.src, landscape, `The React ${tab} tab keeps the shared header`);
  const html = vm.runInContext("recordWindow(headerRecord)", staticContext);
  assert.ok(html.includes(`class="heading-banner-image" src="${landscape}" data-steam-cover="${steamCover}"`), `The static ${tab} tab keeps the shared header`);
  const failed = { src: landscape, dataset: {} };
  image.props.onError({ currentTarget: failed });
  assert.equal(failed.src, steamCover);
  assert.equal(failed.dataset.coverFallback, "true");
}
const headerCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
assert.match(headerCss, /@keyframes record-banner-materialize \{\s*from \{[^}]*\}\s*to \{[^}]*transform: scale\(var\(--header-image-scale, 1\)\);/, "Header access animation retains the selected zoom");
console.log("Header framing passed: bounded independent metadata, original defaults, React/Pages parity and access-animation scale.");

const studioContext = vm.createContext({});
for (const name of ["studioRecordDraftKey", "studioNewDraftKey", "studioDraftKey"]) {
  vm.runInContext(ts.transpileModule(declaration("../components/studio-client.tsx", name), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, studioContext);
}
const draftKey = (form) => { studioContext.form = form; return vm.runInContext('studioDraftKey(form, "__new", "games")', studioContext); };
assert.equal(draftKey({ section: "games", steamDraftAppId: "2", steamAppId: "2" }), "new:games:steam:2");
assert.notEqual(draftKey({ section: "games", steamDraftAppId: "2" }), draftKey({ section: "games", steamDraftAppId: "3" }));
assert.equal(draftKey({ section: "games", steamAppId: "2" }), "new:games", "Typing an app ID in a generic draft does not fork the draft");
assert.equal(draftKey({ section: "games", steamDraftAppId: "2", steamAppId: "3" }), "new:games:steam:2", "Editing the app ID keeps the original draft slot");
assert.equal(draftKey({ section: "games", steamAppId: "" }), "new:games");
assert.equal(draftKey({ originalId: "saved", section: "games", steamAppId: "2" }), "record:saved");
console.log("Steam display tests passed: automatic selection, retired pins, safe create seeds, isolated drafts, React/static parity and bounded one-shot fetch.");
