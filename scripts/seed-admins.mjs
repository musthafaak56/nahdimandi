// One-off seed script: writes admin docs to Firestore.
//
// Usage:
//   1. Download a service-account key JSON from the Firebase console
//      (Project settings -> Service accounts -> Generate new private key).
//   2. export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/key.json
//   3. node scripts/seed-admins.mjs
//
// Alternative (no script): create the two docs manually in the Firebase
// Console under collection `admins`:
//   admins/XS5WoNnycRRsJn3BhU1tOiUQf4L2  { superAdmin: true }
//   admins/3zuCt70MGATcvMMwkzVlHiKnarm2  { superAdmin: true }

import { cert, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const ADMIN_UIDS = [
  "XS5WoNnycRRsJn3BhU1tOiUQf4L2",
  "3zuCt70MGATcvMMwkzVlHiKnarm2",
];

function buildAppOptions() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    const credentials = JSON.parse(readFileSync(keyPath, "utf8"));
    return { credential: cert(credentials), projectId: credentials.project_id };
  }
  return { credential: applicationDefault() };
}

const app = initializeApp(buildAppOptions());
const db = getFirestore(app);

for (const uid of ADMIN_UIDS) {
  await db.collection("admins").doc(uid).set(
    {
      superAdmin: true,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  console.log(`Seeded admins/${uid}`);
}

process.exit(0);
