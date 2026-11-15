"use client";

import { useEffect, useRef, useState } from "react";
import { call } from "@/lib/firebase";
import type { ProjectClass, StudentAssignment } from "@/lib/types";

type Props = { classes: ProjectClass[] };

export default function StudentWorkspace({ classes }: Props) {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await call<{ assignments: StudentAssignment[] }>("listStudentAssignments");
      setAssignments(res.assignments);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void reload(); }, []);

  return (
    <div>
      <div className="row between" style={{ marginBottom: "1rem" }}>
        <div><h1 style={{ marginBottom: ".25rem" }}>My assessments</h1>
          <p className="muted">Evaluate only the criteria and presenters assigned to you.</p>
        </div>
        <button className="secondary" onClick={() => void reload()} disabled={loading}>Refresh</button>
      </div>
      {error && <div role="alert" className="error">{error}</div>}
      {!classes.length && <div className="notice">No class is linked to this account. Ask your teacher to check the imported roster email.</div>}
      {loading && <p>Loading assignments…</p>}
      {!loading && !assignments.length && <div className="panel">
        <h2>No assignments yet</h2>
        <p>Your teacher will create and open the presentation assessment window. Return here once the presentation begins.</p>
      </div>}
      {assignments.map(a => <RatingCard key={a.assignmentId} assignment={a} />)}
      {!!assignments.length && <p className="muted">A submitted rating can be revised until the assessment window closes. Peer and expert results are not visible to raters yet.</p>}
    </div>
  );
}

function RatingCard({ assignment: a }: { assignment: StudentAssignment }) {
  const [score, setScore] = useState(a.rating?.score === null || a.rating?.score === undefined ? "" : String(a.rating.score));
  const [comment, setComment] = useState(a.rating?.comment || "");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(a.rating?.status || "not started");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const version = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const editable = a.window === "open";

  function changeScore(value: string) { setScore(value); version.current++; setDirty(true); }
  function changeComment(value: string) { setComment(value); version.current++; setDirty(true); }

  function save(submit: boolean) {
    const current = version.current;
    const payload = {
      classId: a.classId, sessionId: a.sessionId, presentationId: a.presentationId,
      assignmentId: a.assignmentId, score: score === "" ? null : Number(score),
      comment, submit,
    };
    setSaving(true);
    // Serialize saves so an older debounce request never overwrites a later submit.
    const next = queue.current.catch(() => undefined).then(async () => {
      const response = await call<{ status: string }>("saveStudentRating", payload);
      if (version.current === current) {
        setDirty(false);
        setStatus(response.status);
      }
      setError("");
    });
    queue.current = next;
    return next.catch(err => {
      setError(err instanceof Error ? err.message : String(err));
    }).finally(() => { if (queue.current === next) setSaving(false); });
  }

  useEffect(() => {
    if (!dirty || !editable) return;
    const timer = setTimeout(() => { void save(false); }, 1200);
    return () => clearTimeout(timer);
    // Save current form values after the typing pause.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, comment, dirty, editable]);

  return (
    <section className="panel stack">
      <div className="row between">
        <h2 style={{ margin: 0 }}>{a.presentationTitle}</h2>
        <span className="pill">{a.window === "open" ? "Assessment open" : "Assessment " + a.window}</span>
      </div>
      <div className="subtle">
        <strong>{a.criterionTitle}</strong>
        <p>{a.description}</p>
        <span className="muted">{a.scope === "group" ? "Group" : "Individual"} target: {a.targetName}</span>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} disabled={!editable}>
        <legend><strong>Assessment score (0–3)</strong></legend>
        <div className="cards">
          {a.descriptors.map((descriptor, index) => {
            const number = index + a.minScore;
            return (
              <label key={number} className="card" style={{
                cursor: editable ? "pointer" : "default",
                borderColor: score === String(number) ? "#164a72" : undefined,
                background: score === String(number) ? "#e8f0f7" : undefined,
              }}>
                <span className="row">
                  <input type="radio" name={"score-" + a.assignmentId}
                    checked={score === String(number)}
                    onChange={() => changeScore(String(number))} />
                  <strong>{number}</strong>
                </span>
                <div style={{ fontSize: ".9rem", fontWeight: 400, marginTop: ".45rem" }}>{descriptor}</div>
              </label>
            );
          })}
        </div>
        <label style={{ marginTop: ".8rem" }}>Comments / observations
          <textarea value={comment} onChange={e => changeComment(e.target.value)}
            placeholder="Write specific observations that could help the presenter…" />
        </label>
      </fieldset>
      <div className="row between">
        <small>{saving ? "Saving…" : dirty ? "Unsaved changes" : status === "submitted" ? "Submitted (revisable while open)" : status === "draft" ? "Draft saved" : "Not submitted"}</small>
        <div className="row">
          <button className="secondary" disabled={!editable || saving} onClick={() => void save(false)}>Save draft</button>
          <button disabled={!editable || score === "" || saving} onClick={() => { setDirty(false); void save(true); }}>Submit assessment</button>
        </div>
      </div>
      {error && <div role="alert" className="error">{error}</div>}
    </section>
  );
}
