"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { call, firebaseClient, signIn, signOutCurrent } from "@/lib/firebase";
import type { ClassList, ProjectClass } from "@/lib/types";
import TeacherWorkspace from "@/components/teacher-workspace";
import StudentWorkspace from "@/components/student-workspace";

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [classes, setClasses] = useState<ProjectClass[]>([]);
  const [error, setError] = useState("");

  async function refresh() {
    const response = await call<ClassList>("listMyClasses");
    setRole(response.role);
    setClasses(response.classes);
  }

  useEffect(() => {
    try {
      const auth = firebaseClient().auth;
      return onAuthStateChanged(auth, async current => {
        setUser(current);
        setError("");
        setLoading(true);
        if (current) {
          try {
            // Only allowlisted teachers succeed here. All others are students.
            let isTeacher = false;
            try {
              await call("bootstrapTeacher");
              await current.getIdToken(true);
              isTeacher = true;
            } catch {
              // Not on the teacher allowlist; try roster-linked student enrollment.
            }
            if (!isTeacher) await call("claimRosterInvitations");
            await refresh();
          } catch (err) {
            setError(errorText(err));
          }
        } else {
          setRole(null);
          setClasses([]);
        }
        setLoading(false);
      });
    } catch (err) {
      setError(errorText(err));
      setLoading(false);
      return undefined;
    }
  }, []);

  async function handleSignIn() {
    setError("");
    try { await signIn(); } catch (err) { setError(errorText(err)); }
  }

  return (
    <>
      <header className="top">
        <div className="inner">
          <div className="brand">Rubric Lens <span className="tagline">/ Distributed assessment</span></div>
          {user && (
            <div className="row">
              <small>{user.displayName || user.email}</small>
              <button className="secondary" onClick={() => void signOutCurrent()}>Sign out</button>
            </div>
          )}
        </div>
      </header>
      <main>
        {error && <div role="alert" className="error">{error}</div>}
        {loading ? <div className="panel center">Loading your account…</div>
          : !user ? (
            <section className="panel limit center stack">
              <h1>Focused assessment. Useful feedback.</h1>
              <p className="muted">Sign in with the school Google account listed on your class roster.</p>
              <div><button onClick={() => void handleSignIn()}>Sign in with Google</button></div>
              <small>Accounts must be invited by the teacher. Simply signing in does not grant class access.</small>
            </section>
          ) : role === "teacher" ? (
            <TeacherWorkspace classes={classes} refreshClasses={refresh} />
          ) : role === "student" ? (
            <StudentWorkspace classes={classes} />
          ) : (
            <div className="panel">
              <h2>No class membership yet</h2>
              <p>Your school email must appear on an imported roster. Ask your teacher to verify the email address.</p>
              <button onClick={() => void refresh()}>Retry</button>
            </div>
          )}
        <footer className="muted center" style={{ padding: "1.2rem 0" }}>
          Pilot foundation · Feedback is not visible to students until a controlled release workflow is implemented.
        </footer>
      </main>
    </>
  );
}
