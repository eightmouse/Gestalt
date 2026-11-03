export type PublicRoadmap = {
  title: string;
  intro: string;
  updated: string;
  groups: Array<{
    id: "working" | "ideas" | "done";
    title: string;
    items: Array<{ title: string; detail: string; version?: string; completed?: boolean; releasedOn?: string }>;
  }>;
};
export function validateRoadmap(value: unknown): PublicRoadmap;
export function loadRoadmap(url?: string | URL, fetchImpl?: typeof fetch): Promise<PublicRoadmap>;
export type NotebookFiling = { version: string; date: string; items: string[] };
export function fileNotebookRelease(data: PublicRoadmap, filing: NotebookFiling): PublicRoadmap;
export function validReleaseDate(value: unknown): boolean;
export function releaseDateLabel(value?: string): string;
export type RoadmapChapterId = PublicRoadmap["groups"][number]["id"];
export type RoadmapRelease = {
  version: string;
  title: string;
  releasedOn?: string;
  items: PublicRoadmap["groups"][number]["items"];
};
export function buildRoadmapHistory(data: PublicRoadmap): RoadmapRelease[];
