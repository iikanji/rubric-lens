# Firebase project: rubric-lens-027

This repository is configured for the Firebase project the owner supplied:

- Project ID: `rubric-lens-027`
- Project number / default sender ID: `574540236485`
- Default Firebase Authentication domain: `rubric-lens-027.firebaseapp.com`
- Cloud Functions region in the current code: `asia-northeast1`

The project ID and number are **not credentials**. Do not place Firebase Admin service account JSON, OAuth client secrets, student roster data, teacher allowlists, or local `.env` files in Git.

## Actions required in the Firebase Console

1. Confirm **Authentication → Sign-in method → Google** is enabled.
2. Confirm **Firestore Database** exists (its location is immutable once created).
3. Under **Project settings → Your apps**, register a Web app if needed and copy its Firebase **Web App ID** and **Web API key** into `.env.local`. The project number is not the Web App ID.
4. For Cloud Functions / App Hosting deployment, verify billing eligibility and provision Firebase **App Hosting** from the intended GitHub repository and branch only when ready.
5. Add the teacher's verified Google email to the local `functions/.env.rubric-lens-027` variable `TEACHER_EMAILS` (do not commit this file). Consider using `STUDENT_EMAIL_DOMAIN` to restrict roster imports.
6. Rehearse the full workflow using fictional test accounts, audit security rules, and confirm Reflection I/II and feedback release logic before loading actual school rosters.

**Deployment status:** Not deployed from this repository by ChatGPT. No remote Firebase services have been configured or changed through this chat.
