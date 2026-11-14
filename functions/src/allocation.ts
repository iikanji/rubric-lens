/**
 * Fixed criterion allocation for the pilot. No database dependency.
 * The same rater keeps the same criterion throughout a session.
 * Individual targets rotate evenly among that criterion's assigned raters.
 */
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
export type Rater = { uid: string; displayName: string };
export type Target = { uid: string; displayName: string };
export type Allocation = {
  raterUid: string;
  criterionId: string;
  targetUid: string | null;
  targetName: string;
};

function hash(value: string): number {
  let n = 2166136261;
  for (const ch of value) {
    n ^= ch.charCodeAt(0);
    n = Math.imul(n, 16777619);
  }
  return n >>> 0;
}

function stableOrder<T>(items: T[], seed: string, key: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const ha = hash(seed + ":" + key(a));
    const hb = hash(seed + ":" + key(b));
    return ha === hb ? key(a).localeCompare(key(b)) : ha - hb;
  });
}

export function allocateFixed(
  classRaters: Rater[],
  presenters: Target[],
  criteria: Criterion[],
  sessionId: string,
  presentationId: string,
  mode: "single" | "all" = "single",
): { assignments: Allocation[]; uncovered: string[] } {
  const availableCriteria = stableOrder(
    criteria.filter((c) => c.studentEligible),
    sessionId + ":criteria",
    (c) => c.id,
  );
  const allRaters = stableOrder(classRaters, sessionId + ":raters", (r) => r.uid);
  const presenterIds = new Set(presenters.map((p) => p.uid));
  if (!availableCriteria.length || !presenters.length) {
    return { assignments: [], uncovered: [] };
  }
  const byCriterion = new Map<string, Rater[]>();
  allRaters.forEach((rater, index) => {
    const criterion = availableCriteria[index % availableCriteria.length];
    if (presenterIds.has(rater.uid)) return;
    const array = byCriterion.get(criterion.id) ?? [];
    array.push(rater);
    byCriterion.set(criterion.id, array);
  });

  const assignments: Allocation[] = [];
  const uncovered: string[] = [];
  for (const criterion of availableCriteria) {
    const raters = stableOrder(
      byCriterion.get(criterion.id) ?? [],
      presentationId + ":raters",
      (r) => r.uid,
    );
    const targets = criterion.scope === "group"
      ? [{ uid: "group", displayName: "Presenting group" }]
      : stableOrder(presenters, presentationId + ":targets:" + criterion.id, (p) => p.uid);
    const counts = new Map(targets.map((t) => [t.uid, 0]));
    raters.forEach((rater, index) => {
      const selected = criterion.scope === "individual" && mode === "all"
        ? targets : [targets[index % targets.length]];
      selected.forEach((target) => {
        assignments.push({
          raterUid: rater.uid,
          criterionId: criterion.id,
          targetUid: criterion.scope === "group" ? null : target.uid,
          targetName: target.displayName,
        });
        counts.set(target.uid, (counts.get(target.uid) ?? 0) + 1);
      });
    });
    targets.forEach((target) => {
      if ((counts.get(target.uid) ?? 0) === 0) {
        uncovered.push(criterion.title + ": " + target.displayName);
      }
    });
  }
  return { assignments, uncovered };
}
