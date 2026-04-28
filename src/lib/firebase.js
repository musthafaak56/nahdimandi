import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const envFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function getMissingFirebaseConfig(config) {
  return Object.entries({
    VITE_FIREBASE_API_KEY: config.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: config.authDomain,
    VITE_FIREBASE_PROJECT_ID: config.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: config.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
    VITE_FIREBASE_APP_ID: config.appId,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function normalizeFirebaseConfig(config) {
  return {
    apiKey: config.apiKey || "",
    authDomain: config.authDomain || "",
    projectId: config.projectId || "",
    storageBucket: config.storageBucket || "",
    messagingSenderId: config.messagingSenderId || "",
    appId: config.appId || "",
  };
}

export let firebaseConfig = normalizeFirebaseConfig(envFirebaseConfig);
export let vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
export let missingFirebaseConfig = getMissingFirebaseConfig(firebaseConfig);
export let isFirebaseConfigured = false;
export let firebaseInitSource = "none";
export let firebaseInitError = "";
export let app = null;
export let auth = null;
export let db = null;

let resolveInitialAuth;
let initialAuthPromise = Promise.resolve(null);
let initializeFirebasePromise = null;

function setupInitialAuthListener() {
  initialAuthPromise = new Promise((resolve) => {
    resolveInitialAuth = resolve;
  });

  const unsubscribeInitialAuth = onAuthStateChanged(auth, (user) => {
    resolveInitialAuth(user ?? null);
    unsubscribeInitialAuth();
  });
}

function applyFirebaseConfig(config, source) {
  const normalizedConfig = normalizeFirebaseConfig(config);
  const missingConfig = getMissingFirebaseConfig(normalizedConfig);

  firebaseConfig = normalizedConfig;
  missingFirebaseConfig = missingConfig;
  firebaseInitSource = source;

  if (missingConfig.length > 0) {
    return false;
  }

  app = initializeApp(normalizedConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  isFirebaseConfigured = true;
  firebaseInitError = "";
  setupInitialAuthListener();
  return true;
}

async function loadHostingRuntimeConfig() {
  if (typeof window === "undefined") {
    return null;
  }

  const response = await fetch("/__/firebase/init.json", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Runtime config request failed with ${response.status}.`);
  }

  return response.json();
}

export async function initializeFirebase() {
  if (app) {
    return true;
  }

  if (initializeFirebasePromise) {
    return initializeFirebasePromise;
  }

  initializeFirebasePromise = (async () => {
    if (applyFirebaseConfig(envFirebaseConfig, "env")) {
      return true;
    }

    try {
      const hostingConfig = await loadHostingRuntimeConfig();

      if (hostingConfig && applyFirebaseConfig(hostingConfig, "hosting-runtime")) {
        return true;
      }
    } catch (error) {
      firebaseInitError =
        error instanceof Error
          ? error.message
          : "Runtime Firebase config could not be loaded.";
    }

    firebaseInitSource = "missing";
    isFirebaseConfigured = false;
    return false;
  })();

  return initializeFirebasePromise;
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
      user.providerData.some(({ providerId }) => providerId === "password")
  );
}
