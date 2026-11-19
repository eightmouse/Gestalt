import assert from "node:assert/strict";
import sectionMotion from "../public/section-motion.js";

function fixture() {
  const document = new EventTarget();
  const motion = new EventTarget();
  const timers = new Map();
  const events = [];
  let id = 0, update, busy = false;
  const shell = { matches: () => busy };
  const lamp = (name) => ({ animate(_, timing) {
    events.push([name, timing.duration]);
    return { cancel: () => events.push([name, "cancel"]) };
  } });
  const shelves = ["session", "past"].map((name) => ({ querySelector: (query) => query === "[data-game-sleeve]" ? true : query === ".game-shelf-bus i" ? lamp(name) : null }));
  const section = { isConnected: true, closest: () => shell, querySelectorAll: () => shelves, querySelector: () => lamp("milestone") };
  const host = { document, matchMedia: () => motion,
    setTimeout(callback, delay) { timers.set(++id, [callback, delay]); return id; },
    clearTimeout(ticket) { timers.delete(ticket); },
    MutationObserver: class {
      constructor(callback) { update = callback; }
      observe(target, options) { assert.equal(target, shell); assert.ok(!options.subtree); }
      disconnect() { update = null; }
    }
  };
  return { section, host, timers, events, document, motion,
    run() { const [ticket, [callback]] = [...timers][0]; timers.delete(ticket); callback(); },
    block(value) { busy = value; update?.(); },
    get watching() { return Boolean(update); }
  };
}

const games = fixture();
const dispose = sectionMotion.bindSectionStandby(games.section, "games", games.host);
assert.equal(games.timers.size, 1);
assert.equal([...games.timers.values()][0][1], 6000);
games.run();
games.run();
assert.deepEqual(games.events, [["session", 850], ["past", 850]], "Games poll one shelf at a time");
games.block(true);
assert.equal(games.timers.size, 0);
assert.deepEqual(games.events.at(-1), ["past", "cancel"], "Reading cancels an active pulse");
games.block(false);
games.document.hidden = true;
games.document.dispatchEvent(new Event("visibilitychange"));
assert.equal(games.timers.size, 0, "A hidden tab stops scheduling work");
games.document.hidden = false;
games.document.dispatchEvent(new Event("visibilitychange"));
assert.equal(games.timers.size, 1);
dispose();
assert.equal(games.timers.size, 0);
assert.equal(games.watching, false);
games.document.dispatchEvent(new Event("visibilitychange"));
assert.equal(games.timers.size, 0, "Leaving the section removes its listeners");

const projects = fixture();
projects.motion.matches = true;
const release = sectionMotion.bindSectionStandby(projects.section, "projects", projects.host);
assert.equal(projects.timers.size, 0, "Reduced Motion schedules no cue at all");
projects.motion.matches = false;
projects.motion.dispatchEvent(new Event("change"));
projects.run();
assert.deepEqual(projects.events, [["milestone", 900]], "Projects prefer the active milestone rather than a shelf effect");
release();
const rotation = fixture();
const plate = Object.assign(new EventTarget(), {
  isConnected: true, dataset: { projectCount: "2" },
  querySelector: () => null, closest: rotation.section.closest,
  contains: () => focused
});
let focused = false, turns = 0;
let changed;
rotation.host.MutationObserver = class {
  constructor(callback) { changed = callback; }
  observe() {}
  disconnect() { changed = undefined; }
};
rotation.host.queueMicrotask = queueMicrotask;
const handheld = Object.assign(new EventTarget(), { matches: true });
rotation.host.matchMedia = (query) => query === "(max-width: 760px)" ? handheld : rotation.motion;
const unbind = sectionMotion.bindProjectRotation(plate, () => turns++, rotation.host);
assert.equal(rotation.timers.size, 0, "Handheld never arms the project rotation timer");
handheld.matches = false;
handheld.dispatchEvent(new Event("change"));
assert.equal([...rotation.timers.values()][0][1], 6600);
rotation.run();
assert.equal(turns, 1, "Idle projects advance automatically");
assert.equal(rotation.timers.size, 1, "Only one rotation timer is pending");
handheld.matches = true;
handheld.dispatchEvent(new Event("change"));
assert.equal(rotation.timers.size, 0, "Switching to handheld cancels the pending turn");
handheld.matches = false;
handheld.dispatchEvent(new Event("change"));
plate.closest = () => plate;
plate.dispatchEvent(new Event("pointerover"));
assert.equal(rotation.timers.size, 0);
plate.dispatchEvent(new Event("pointerout"));
assert.equal(rotation.timers.size, 1);
rotation.document.activeElement = { matches: () => true };
focused = true; plate.dispatchEvent(new Event("focusin"));
assert.equal(rotation.timers.size, 0, "Keyboard focus holds the current plate");
focused = false; plate.dispatchEvent(new Event("focusout"));
await Promise.resolve();
assert.equal(rotation.timers.size, 1);
rotation.document.hidden = true;
rotation.document.dispatchEvent(new Event("visibilitychange"));
assert.equal(rotation.timers.size, 0);
rotation.document.hidden = false;
rotation.document.dispatchEvent(new Event("visibilitychange"));
rotation.motion.matches = true;
rotation.motion.dispatchEvent(new Event("change"));
assert.equal(rotation.timers.size, 0);
rotation.motion.matches = false;
rotation.motion.dispatchEvent(new Event("change"));
plate.dataset.projectCount = "1"; changed();
assert.equal(rotation.timers.size, 0);
plate.dataset.projectCount = "3"; changed();
plate.dispatchEvent(new Event("focusout"));
unbind();
await Promise.resolve();
assert.equal(rotation.timers.size, 0, "Disposing rotation cannot leave a queued timer behind");

const swipeArea = new EventTarget();
const directions = [], captures = [];
swipeArea.setPointerCapture = (id) => captures.push(id);
const hit = { closest: () => hit };
const fire = (type, x, y, props = {}) => {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { clientX: x, clientY: y, pointerId: 1, pointerType: "touch", isPrimary: true, detail: 1 }, props);
  Object.defineProperty(event, "target", { value: hit });
  swipeArea.dispatchEvent(event);
  return event.defaultPrevented;
};
const releaseSwipe = sectionMotion.bindProjectSwipe(swipeArea, (direction) => directions.push(direction), rotation.host);
const swipe = (x, y, finish = "pointerup") => {
  fire("pointerdown", 160, 100);
  fire("pointermove", x, y);
  fire(finish, x, y);
};
swipe(55, 100);
assert.deepEqual(directions, [], "Pointer gestures leave the desktop plate alone");
handheld.matches = true;
swipe(55, 100);
assert.deepEqual(directions, [1]);
assert.deepEqual(captures, [1]);
assert.equal(fire("click", 55, 100, { detail: 0 }), false, "Swipe suppression does not swallow keyboard activation");
assert.equal(fire("click", 55, 100), true, "A post-swipe click must not open the plate");
swipe(178, 100);
assert.deepEqual(directions, [1], "A short drag cannot step");
assert.equal(fire("click", 178, 100), true, "A short drag cannot open the plate either");
swipe(153, 10);
swipe(55, 100, "pointercancel");
assert.deepEqual(directions, [1], "Vertical and canceled gestures do not step");
swipe(250, 100);
assert.deepEqual(directions, [1, -1]);
fire("pointerdown", 175, 100);
fire("pointerup", 175, 100);
assert.equal(fire("click", 175, 100), false, "A fresh tap opens the plate normally");
releaseSwipe();
swipe(55, 100);
assert.deepEqual(directions, [1, -1], "Unbinding detaches the gesture");
console.log("Section standby tests passed: shelf alternation, project rotation, touch gestures, reduced motion and cleanup.");
