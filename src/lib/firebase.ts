"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider, connectAuthEmulator, getAuth,
  signInWithPopup, signOut,
} from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";

let emulatorConnected = false;

export function firebaseClient() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error("Firebase web app configuration is missing. See .env.local.example.");
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const functions = getFunctions(app, "asia-northeast1");
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true" && !emulatorConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    emulatorConnected = true;
  }
  return { auth, functions };
}

export async function call<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const fn = httpsCallable<Record<string, unknown>, T>(firebaseClient().functions, action);
  const result = await fn(data);
  return result.data;
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(firebaseClient().auth, provider);
}

export async function signOutCurrent() {
  return signOut(firebaseClient().auth);
}
