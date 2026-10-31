export type PublicRoadmap = {
  title: string;
  intro: string;
  updated: string;
  groups: Array<{
    id: "working" | "ideas" | "done";
    title: string;
    items: Array<{ title: string; detail: string; version?: string }>;
  }>;
};
export const publicRoadmap: PublicRoadmap;
export type RoadmapChapterId = PublicRoadmap["groups"][number]["id"];
export type RoadmapRelease = {
  version: string;
  title: string;
  items: PublicRoadmap["groups"][number]["items"];
};
export function buildRoadmapHistory(data: PublicRoadmap): RoadmapRelease[];
