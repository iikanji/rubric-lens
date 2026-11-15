"use client";

import { useState } from "react";
import { call } from "@/lib/firebase";
import type { Invitation, Student } from "@/lib/types";

type Props = {
  classId: string;
  invitations: Invitation[];
  members: Student[];
  busy: boolean;
  run: (job: () => Promise<void>) => Promise<void>;
  reload: () => Promise<void>;
  notify: (message: string) => void;
};

export default function RosterManager({ classId, invitations, members, busy, run, reload, notify }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [ordering, setOrdering] = useState<string[]>([]);
  const [reordering, setReordering] = useState(false);

  const ordered = reordering
    ? ordering.map(address => invitations.find(inv => inv.email === address)).filter((inv): inv is Invitation => !!inv)
    : invitations;

  function beginReorder() {
    setOrdering(invitations.map(inv => inv.email));
    setReordering(true);
  }
  function move(index: number, delta: number) {
    const next = [...ordering];
    const to = index + delta;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setOrdering(next);
  }
  async function action(name: string, data: Record<string, unknown>) {
    await run(async () => {
      await call(name, { classId, ...data });
      await reload();
      notify("Roster updated.");
    });
  }

  return (
    <div className="stack">
      <div className="row between">
        <h3 style={{ margin: 0 }}>Manage students individually</h3>
        <span className="pill">{invitations.length} invited · {members.filter(m => m.active).length} joined</span>
      </div>
      <div className="subtle stack">
        <strong>Add a student</strong>
        <div className="two">
          <label>Name<input value={name} onChange={e => setName(e.target.value)} placeholder="Student name" /></label>
          <label>Google account email<input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="student@school.edu" /></label>
        </div>
        <div>
          <button disabled={busy || !name.trim() || !email.trim()} onClick={() => void run(async () => {
            await call("addRosterStudent", { classId, name, email });
            setName(""); setEmail("");
            await reload();
            notify("Student invitation added.");
          })}>Add student</button>
        </div>
      </div>
      {invitations.length > 0 && (
        <>
          <div className="row between">
            <strong>Class roster</strong>
            {!reordering ? (
              <button className="secondary" disabled={busy || invitations.length < 2} onClick={beginReorder}>Rearrange order</button>
            ) : (
              <div className="row">
                <button className="secondary" disabled={busy} onClick={() => setReordering(false)}>Cancel</button>
                <button disabled={busy} onClick={() => void run(async () => {
                  await call("reorderRoster", { classId, emails: ordering });
                  await reload();
                  setReordering(false);
                  notify("Roster order saved.");
                })}>Save order</button>
              </div>
            )}
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Order</th><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {ordered.map((inv, i) => {
                  const member = members.find(m => m.email.toLowerCase() === inv.email.toLowerCase() && m.active);
                  const joined = inv.claimed && !!member;
                  return (
                    <tr key={inv.email}>
                      <td>{i + 1}</td>
                      <td>{editing === inv.email ? <input aria-label="Edit student name" value={editName} onChange={e => setEditName(e.target.value)} /> : inv.name}</td>
                      <td>{editing === inv.email ? <input aria-label="Edit student email" type="email" disabled={joined} value={editEmail} onChange={e => setEditEmail(e.target.value)} /> : inv.email}</td>
                      <td><span className="pill">{joined ? "Joined" : "Invited"}</span></td>
                      <td>
                        {reordering ? (
                          <div className="row">
                            <button className="secondary" aria-label={"Move " + inv.name + " up"} disabled={busy || i === 0} onClick={() => move(i, -1)}>↑</button>
                            <button className="secondary" aria-label={"Move " + inv.name + " down"} disabled={busy || i === ordered.length - 1} onClick={() => move(i, 1)}>↓</button>
                          </div>
                        ) : editing === inv.email ? (
                          <div className="row">
                            <button disabled={busy || !editName.trim() || !editEmail.trim()} onClick={() => void run(async () => {
                              await call("editRosterStudent", { classId, originalEmail: inv.email, name: editName, email: editEmail });
                              setEditing(null);
                              await reload();
                              notify("Student details saved.");
                            })}>Save</button>
                            <button className="secondary" onClick={() => setEditing(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="row">
                            <button className="secondary" disabled={busy} onClick={() => {
                              setEditing(inv.email); setEditName(inv.name); setEditEmail(inv.email);
                            }}>Edit</button>
                            <button className="secondary" disabled={busy} onClick={() => {
                              if (!window.confirm("Remove " + inv.name + " from this class? Joined students will lose access; previous assessments will be preserved.")) return;
                              void action("removeRosterStudent", { email: inv.email });
                            }}>Remove</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <small>Changes to a joined student's email are disabled because their Google account is already linked. Removing a joined student revokes class access without deleting historical ratings. Order affects roster display, not assessment assignments.</small>
        </>
      )}
    </div>
  );
}
