import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

export const missingFirebaseConfig = Object.entries({
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseConfig.length === 0;

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

let resolveInitialAuth;
const initialAuthPromise = auth
  ? new Promise((resolve) => {
      resolveInitialAuth = resolve;
    })
  : Promise.resolve(null);

if (auth) {
  const unsubscribeInitialAuth = onAuthStateChanged(auth, (user) => {
    resolveInitialAuth(user ?? null);
    unsubscribeInitialAuth();
  });
}

export async function waitForInitialAuth() {
  return auth?.currentUser ?? initialAuthPromise;
}

export async function ensureAnonymousSession() {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }

  const existingUser = auth.currentUser ?? (await waitForInitialAuth());

  if (existingUser) {
    return existingUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

export function isPasswordUser(user) {
  return Boolean(
    user &&
    !user.isAnonymous &&
    user.providerData.some(({ providerId }) => providerId === "password"),
  );
}

export { firebaseConfig };
