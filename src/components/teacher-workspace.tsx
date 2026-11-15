"use client";

import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { call } from "@/lib/firebase";
import { parseRosterCsv, type RosterRow } from "@/lib/csv";
import RosterManager from "@/components/roster-manager";
import type { ClassDetail, CriterionDraft, PresentationDetail, ProjectClass, SessionSummary } from "@/lib/types";

const defaultCriteria: CriterionDraft[] = [
  {
    title: "Organization",
    description: "Clarity and logical flow of the presentation.",
    scope: "group", studentEligible: true, expertEligible: true,
    descriptors: [
      "No coherent organization is evident.",
      "The sequence is difficult to follow.",
      "Mostly logical sequence with minor gaps.",
      "Clear, coherent sequence throughout.",
    ],
  },
  {
    title: "Eye contact",
    description: "Engagement with the audience.",
    scope: "individual", studentEligible: true, expertEligible: false,
    descriptors: [
      "No audience eye contact observed.",
      "Occasional eye contact with minimal engagement.",
      "Frequent eye contact, with some dependence on notes.",
      "Consistent and purposeful audience eye contact.",
    ],
  },
];

function errorMessage(e: unknown) { return e instanceof Error ? e.message : String(e); }

type Props = { classes: ProjectClass[]; refreshClasses: () => Promise<void> };

export default function TeacherWorkspace({ classes, refreshClasses }: Props) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [details, setDetails] = useState<ClassDetail | null>(null);
  const [name, setName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [rubricTitle, setRubricTitle] = useState("Presentation rubric");
  const [criteria, setCriteria] = useState<CriterionDraft[]>(defaultCriteria);
  const [sessionTitle, setSessionTitle] = useState("Presentation session");
  const [presentationTitle, setPresentationTitle] = useState("");
  const [selectedPresenters, setSelectedPresenters] = useState<string[]>([]);
  const [rosterPreview, setRosterPreview] = useState<RosterRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chosenPresentation, setChosenPresentation] = useState<{ sessionId: string; id: string } | null>(null);
  const [presentationDetail, setPresentationDetail] = useState<PresentationDetail | null>(null);

  const reloadClass = useCallback(async (id: string) => {
    const fresh = await call<ClassDetail>("getTeacherClass", { classId: id });
    setDetails(fresh);
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      void reloadClass(selectedClassId).catch(err => setError(errorMessage(err)));
    } else {
      setDetails(null);
    }
  }, [selectedClassId, reloadClass]);

  async function act(job: () => Promise<void>) {
    setError("");
    setMessage("");
    setBusy(true);
    try { await job(); } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  async function createNewClass() {
    await act(async () => {
      const res = await call<{ classId: string }>("createClass", { name, projectName });
      await refreshClasses();
      setSelectedClassId(res.classId);
      setName("");
      setProjectName("");
      setMessage("Class created.");
    });
  }

  function changeCriterion(index: number, patch: Partial<CriterionDraft>) {
    setCriteria(prev => prev.map((c, i) => i === index ? { ...c, ...patch } : c));
  }
  function updateDescriptor(index: number, level: number, value: string) {
    setCriteria(prev => prev.map((c, i) => {
      if (index !== i) return c;
      const descriptors = [...c.descriptors];
      descriptors[level] = value;
      return { ...c, descriptors };
    }));
  }

  async function loadCsv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      const content = await file.text();
      setRosterPreview(parseRosterCsv(content));
    } catch (err) {
      setError(errorMessage(err));
      setRosterPreview([]);
    }
  }

  async function viewPresentation(sessionId: string, id: string) {
    await act(async () => {
      setChosenPresentation({ sessionId, id });
      const result = await call<PresentationDetail>("getTeacherPresentation", {
        classId: selectedClassId, sessionId, presentationId: id,
      });
      setPresentationDetail(result);
    });
  }

  async function updateWindow(sessionId: string, id: string, command: "openPresentation" | "closePresentation") {
    await act(async () => {
      const outcome = await call<{ uncovered?: string[] }>(command, {
        classId: selectedClassId, sessionId, presentationId: id,
      });
      await reloadClass(selectedClassId);
      if (chosenPresentation?.id === id) {
        const result = await call<PresentationDetail>("getTeacherPresentation", {
          classId: selectedClassId, sessionId, presentationId: id,
        });
        setPresentationDetail(result);
      }
      setMessage(
        command === "openPresentation" && outcome.uncovered?.length
          ? "Assessment open. Coverage warning: " + outcome.uncovered.join("; ")
          : "Presentation updated.",
      );
    });
  }

  async function expertRate(row: { criterionId: string; targetUid: string | null }, score: number, comment: string) {
    if (!chosenPresentation) return;
    await act(async () => {
      await call("saveExpertRating", {
        classId: selectedClassId,
        sessionId: chosenPresentation.sessionId, presentationId: chosenPresentation.id,
        criterionId: row.criterionId, targetUid: row.targetUid,
        score, comment,
      });
      const fresh = await call<PresentationDetail>("getTeacherPresentation", {
        classId: selectedClassId, sessionId: chosenPresentation.sessionId, presentationId: chosenPresentation.id,
      });
      setPresentationDetail(fresh);
      setMessage("Expert rating saved.");
    });
  }

  return (
    <div>
      <section className="row between" style={{ marginBottom: "1rem" }}>
        <div>
          <h1 style={{ marginBottom: ".25rem" }}>Teacher workspace</h1>
          <div className="muted">Classes, rubrics, presentation sessions, and criterion-specific ratings</div>
        </div>
        <span className="pill">Pilot foundation</span>
      </section>
      {error && <div role="alert" className="error">{error}</div>}
      {message && <div role="status" className="notice">{message}</div>}
      <div className="two">
        <section className="panel stack">
          <h2>Create a class</h2>
          <label>Class name<input value={name} onChange={e => setName(e.target.value)} placeholder="Class 10A" /></label>
          <label>Assessment project<input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Research presentations" /></label>
          <button disabled={busy || !name.trim()} onClick={() => void createNewClass()}>Create class</button>
          <small>Separate classes keep their students and results isolated. Use a shared project name for related classes.</small>
        </section>
        <section className="panel stack">
          <h2>Select a class</h2>
          <label>Class
            <select value={selectedClassId} onChange={e => {
              setSelectedClassId(e.target.value);
              setChosenPresentation(null);
              setPresentationDetail(null);
            }}>
              <option value="">Choose a class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.projectName || c.name})</option>)}
            </select>
          </label>
          {classes.length === 0 && <p className="muted">Create your first class to begin.</p>}
          {selectedClassId && <button className="secondary" disabled={busy} onClick={() => void act(async () => { await reloadClass(selectedClassId); setMessage("Updated."); })}>Refresh class</button>}
        </section>
      </div>

      {selectedClassId && details?.class.id === selectedClassId && (
        <>
          <section className="panel stack">
            <div className="row between"><h2 style={{ margin: 0 }}>{details.class.name}: student roster</h2><span className="pill">{details.members.length} joined</span></div>
            <p className="muted">Import a CSV with headers <span className="code">Name,Email</span>. Students join only by signing in with the exact verified Google email. Use synthetic accounts until access testing is complete.</p>
            <input type="file" accept=".csv,text/csv" aria-label="Import roster CSV" onChange={e => void loadCsv(e)} />
            {rosterPreview.length > 0 && (
              <div className="stack">
                <div className="row between">
                  <span>Ready to import {rosterPreview.length} roster entries.</span>
                  <button disabled={busy || rosterPreview.length > 150} onClick={() => void act(async () => {
                    await call("importRoster", { classId: selectedClassId, rows: rosterPreview });
                    await reloadClass(selectedClassId);
                    setRosterPreview([]);
                    setMessage("Roster invitations imported.");
                  })}>Confirm import</button>
                </div>
                <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th></tr></thead><tbody>
                  {rosterPreview.slice(0, 8).map(r => <tr key={r.email}><td>{r.name}</td><td>{r.email}</td></tr>)}
                </tbody></table></div>
                {rosterPreview.length > 8 && <small>Showing the first eight entries for review.</small>}
              </div>
            )}
            <RosterManager
              classId={selectedClassId}
              invitations={details.invitations}
              members={details.members}
              busy={busy}
              run={act}
              reload={() => reloadClass(selectedClassId)}
              notify={setMessage}
            />
          </section>

          {!details.rubric ? (
            <section className="panel stack">
              <h2>Create a 0–3 rubric</h2>
              <p className="muted">Edit the sample criteria and performance descriptors. You can define group-level or individual-level targets and student/expert eligibility.</p>
              <label>Rubric title<input value={rubricTitle} onChange={e => setRubricTitle(e.target.value)} /></label>
              {criteria.map((c, idx) => (
                <div className="subtle stack" key={idx}>
                  <div className="row between">
                    <strong>Criterion {idx + 1}</strong>
                    <button className="secondary" disabled={criteria.length < 2} onClick={() => setCriteria(prev => prev.filter((_, i) => i !== idx))}>Remove</button>
                  </div>
                  <label>Criterion name<input value={c.title} onChange={e => changeCriterion(idx, { title: e.target.value })} /></label>
                  <label>Description<textarea value={c.description} onChange={e => changeCriterion(idx, { description: e.target.value })} /></label>
                  <div className="two">
                    <label>Assesses
                      <select value={c.scope} onChange={e => changeCriterion(idx, { scope: e.target.value as "group" | "individual" })}>
                        <option value="group">Whole group</option><option value="individual">Individual presenter</option>
                      </select>
                    </label>
                    <div className="stack">
                      <label className="radio"><input type="checkbox" checked={c.studentEligible} onChange={e => changeCriterion(idx, { studentEligible: e.target.checked })} /> Student raters eligible</label>
                      <label className="radio"><input type="checkbox" checked={c.expertEligible} onChange={e => changeCriterion(idx, { expertEligible: e.target.checked })} /> Expert raters eligible</label>
                    </div>
                  </div>
                  <div className="two">
                    {c.descriptors.map((d, level) => (
                      <label key={level}>Level {level} descriptor
                        <textarea rows={2} value={d} onChange={e => updateDescriptor(idx, level, e.target.value)} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="row">
                <button className="secondary" disabled={criteria.length >= 24} onClick={() => setCriteria(prev => [...prev, {
                  title: "New criterion", description: "", scope: "group",
                  studentEligible: true, expertEligible: true,
                  descriptors: ["Not demonstrated", "Beginning", "Developing", "Strong"],
                }])}>Add criterion</button>
                <button disabled={busy} onClick={() => void act(async () => {
                  await call("saveClassRubric", { classId: selectedClassId, title: rubricTitle, criteria });
                  await reloadClass(selectedClassId);
                  setMessage("Rubric saved.");
                })}>Save rubric</button>
              </div>
            </section>
          ) : (
            <section className="panel">
              <h2>{details.rubric.title}</h2>
              <p className="muted">0–3 scoring · {details.rubric.criteria.length} criteria</p>
              <div className="cards">
                {details.rubric.criteria.map(c => (
                  <div className="card" key={c.id}>
                    <strong>{c.title}</strong><div className="muted">{c.description}</div>
                    <div><span className="pill">{c.scope}</span> <small>{c.studentEligible ? "Students" : "Student-exempt"} · {c.expertEligible ? "Experts" : "Expert-exempt"}</small></div>
                  </div>
                ))}
              </div>
              <small>A replacement rubric editor and CSV rubric import are planned. Saved session rubrics remain immutable for the pilot.</small>
            </section>
          )}

          {details.rubric && (
            <section className="panel stack">
              <h2>Presentation sessions</h2>
              <div className="row">
                <input style={{ flex: 1 }} aria-label="New session title" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} />
                <button disabled={busy} onClick={() => void act(async () => {
                  await call("createSession", { classId: selectedClassId, title: sessionTitle });
                  await reloadClass(selectedClassId);
                  setMessage("Session created.");
                })}>Create session</button>
              </div>
              <div className="subtle">
                <strong>New presentation: choose presenters</strong>
                <p className="muted">The same selection is used for the Add Presentation action in a session below.</p>
                <label>Presentation title (optional)<input value={presentationTitle} onChange={e => setPresentationTitle(e.target.value)} placeholder="Group 1" /></label>
                <div className="row" style={{ marginTop: ".6rem" }}>
                  {details.members.map(m => (
                    <label key={m.uid} className="radio">
                      <input type="checkbox" checked={selectedPresenters.includes(m.uid)}
                        onChange={e => setSelectedPresenters(prev => e.target.checked ? [...prev, m.uid] : prev.filter(x => x !== m.uid))} />{m.name}
                    </label>
                  ))}
                </div>
                {details.members.length === 0 && <small>Students must sign in after roster import before they can be selected.</small>}
              </div>
              {details.sessions.map((session: SessionSummary) => (
                <div className="card stack" key={session.id}>
                  <div className="row between"><h3 style={{ margin: 0 }}>{session.title}</h3><span className="pill">{session.state}</span></div>
                  <button className="secondary" disabled={busy || selectedPresenters.length === 0} onClick={() => void act(async () => {
                    await call("createPresentation", {
                      classId: selectedClassId, sessionId: session.id,
                      title: presentationTitle, presenterUids: selectedPresenters,
                    });
                    await reloadClass(selectedClassId);
                    setSelectedPresenters([]);
                    setPresentationTitle("");
                    setMessage("Presentation added.");
                  })}>Add presentation to this session</button>
                  {session.presentations.map(p => (
                    <div className="subtle" key={p.id}>
                      <div className="row between"><strong>{p.title}</strong><span className="pill">{p.window}</span></div>
                      <div className="row" style={{ marginTop: ".6rem" }}>
                        {p.window === "not_open" && <button disabled={busy} onClick={() => void updateWindow(session.id, p.id, "openPresentation")}>Generate assignments & open</button>}
                        {p.window === "open" && <button disabled={busy} onClick={() => void updateWindow(session.id, p.id, "closePresentation")}>Close assessment window</button>}
                        <button className="secondary" disabled={busy} onClick={() => void viewPresentation(session.id, p.id)}>View ratings</button>
                      </div>
                      {p.uncovered?.length > 0 && <div className="notice">Uncovered: {p.uncovered.join("; ")}</div>}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )}

          {chosenPresentation && presentationDetail && (
            <section className="panel stack">
              <h2>{presentationDetail.presentation.title}: assessment review</h2>
              <p className="muted">Preliminary results, visible to the teacher only. No presenter feedback has been released.</p>
              <div className="table-scroll"><table>
                <thead><tr><th>Criterion / target</th><th>Student ratings</th><th>Student mean</th><th>Expert result</th></tr></thead>
                <tbody>{presentationDetail.results.map(r => <tr key={r.criterionId + (r.targetUid || "group")}>
                  <td><strong>{r.criterionTitle}</strong><div className="muted">{r.targetName}</div></td>
                  <td>{r.peerScores.length ? r.peerScores.join(", ") : "Not assessed"}</td>
                  <td>{r.peerAverage === null ? "—" : r.peerAverage.toFixed(2) + " / 3"}</td>
                  <td>{r.expertAverage === null ? "—" : r.expertAverage.toFixed(2) + " / 3"}</td>
                </tr>)}</tbody>
              </table></div>
              <h3>Expert assessment (teacher)</h3>
              {presentationDetail.presentation.window !== "open"
                ? <p className="muted">Expert rating entry is available only while the assessment window is open.</p>
                : details.rubric?.criteria.filter(c => c.expertEligible).flatMap(c => {
                    const targets = c.scope === "group"
                      ? [{ uid: null, displayName: "Presenting group" }]
                      : presentationDetail.presentation.presenters;
                    return targets.map(target => (
                      <ExpertForm key={c.id + (target.uid ?? "group")}
                        title={c.title + " · " + target.displayName}
                        criterionId={c.id} targetUid={target.uid}
                        existing={presentationDetail.experts.find(e => e.criterionId === c.id && e.targetUid === target.uid)}
                        busy={busy} onSubmit={expertRate} />
                    ));
                  })}
              <h3>Student submissions</h3>
              <div className="table-scroll"><table><thead><tr><th>Rater</th><th>Criterion</th><th>Target</th><th>Score</th><th>Status</th><th>Comment</th></tr></thead>
                <tbody>{presentationDetail.assignments.map(a => <tr key={a.id}>
                  <td>{details.members.find(m => m.uid === a.raterUid)?.name || "Student"}</td>
                  <td>{details.rubric?.criteria.find(c => c.id === a.criterionId)?.title || a.criterionId}</td>
                  <td>{a.targetName}</td><td>{a.rating?.score ?? "—"}</td>
                  <td>{a.rating?.status || "Not started"}</td><td>{a.rating?.comment || "—"}</td>
                </tr>)}</tbody>
              </table></div>
              <button className="secondary" disabled={busy} onClick={() => void viewPresentation(chosenPresentation.sessionId, chosenPresentation.id)}>Refresh ratings</button>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ExpertForm({ title, criterionId, targetUid, existing, busy, onSubmit }: {
  title: string;
  criterionId: string;
  targetUid: string | null;
  existing?: { score: number; comment: string };
  busy: boolean;
  onSubmit: (target: { criterionId: string; targetUid: string | null }, score: number, comment: string) => Promise<void>;
}) {
  const [score, setScore] = useState(String(existing?.score ?? ""));
  const [comment, setComment] = useState(existing?.comment ?? "");
  return (
    <div className="subtle stack">
      <strong>{title}</strong>
      <div className="two">
        <label>Expert score (0–3)
          <select value={score} onChange={e => setScore(e.target.value)}>
            <option value="">Choose</option>
            {[0, 1, 2, 3].map(n => <option value={n} key={n}>{n}</option>)}
          </select>
        </label>
        <label>Expert comment
          <textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} />
        </label>
      </div>
      <div><button disabled={busy || score === ""} onClick={() => void onSubmit({ criterionId, targetUid }, Number(score), comment)}>Save expert assessment</button></div>
    </div>
  );
}
