export type Criterion = {
  id: string;
  title: string;
  description: string;
  scope: "group" | "individual";
  studentEligible: boolean;
  expertEligible: boolean;
  minScore: number;
  maxScore: number;
  descriptors: string[];
};
export type CriterionDraft = Omit<Criterion, "id" | "minScore" | "maxScore">;

export type ProjectClass = { id: string; name: string; projectName?: string };
export type ClassList = { role: "teacher" | "student"; classes: ProjectClass[] };
export type Student = { uid: string; name: string; email: string };
export type Invitation = { name: string; email: string; claimed: boolean };
export type PresentationSummary = {
  id: string;
  title: string;
  state: string;
  window: string;
  uncovered: string[];
};
export type SessionSummary = {
  id: string;
  title: string;
  state: string;
  presentations: PresentationSummary[];
};
export type ClassDetail = {
  class: ProjectClass;
  rubric: { id: string; title: string; criteria: Criterion[] } | null;
  members: Student[];
  invitations: Invitation[];
  sessions: SessionSummary[];
};
export type StudentAssignment = {
  assignmentId: string;
  classId: string;
  sessionId: string;
  presentationId: string;
  criterionId: string;
  criterionTitle: string;
  description: string;
  descriptors: string[];
  minScore: number;
  maxScore: number;
  targetUid: string | null;
  targetName: string;
  presentationTitle: string;
  scope: "group" | "individual";
  window: "open" | "closed" | "not_open";
  rating: { score: number | null; comment: string; status: "draft" | "submitted" } | null;
};
export type ResultRow = {
  criterionId: string;
  criterionTitle: string;
  targetUid: string | null;
  targetName: string;
  peerCount: number;
  peerScores: number[];
  peerAverage: number | null;
  expertScores: number[];
  expertAverage: number | null;
};
export type PresentationDetail = {
  presentation: {
    id: string;
    title: string;
    window: string;
    presenters: { uid: string; displayName: string }[];
    uncovered?: string[];
  };
  assignments: Array<{
    id: string;
    raterUid: string;
    criterionId: string;
    targetUid: string | null;
    targetName: string;
    rating: { score: number | null; comment: string; status: string } | null;
  }>;
  experts: Array<{
    criterionId: string;
    targetUid: string | null;
    score: number;
    comment: string;
  }>;
  results: ResultRow[];
};
