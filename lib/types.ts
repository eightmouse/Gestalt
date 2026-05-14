export type RecordSection = "system" | "projects" | "games" | "logs" | "setup" | "archive";

export type Milestone = {
  label: string;
  progress: number;
  status: string;
};

export type RecordEntry = {
  id: string;
  title: string;
  section: RecordSection;
  type: string;
  status: string;
  started?: string;
  updated: string;
  mood?: string;
  summary: string;
  banner?: string;
  progress: number;
  priority: number;
  tags: string[];
  meta: Record<string, string | number | boolean | string[]>;
  milestones: Milestone[];
  body: string;
};
