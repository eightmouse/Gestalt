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
