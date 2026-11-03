import type { PublicRoadmap, NotebookFiling } from "../public/roadmap.mjs";
export class NotebookConflict extends Error {}
export class NotebookInputError extends Error {}
export type NotebookSnapshot = { data: PublicRoadmap; revision: string };
export function readNotebook(root: string): Promise<NotebookSnapshot>;
export function saveNotebook(root: string, data: unknown, revision: unknown, now?: Date, filing?: NotebookFiling): Promise<NotebookSnapshot>;
