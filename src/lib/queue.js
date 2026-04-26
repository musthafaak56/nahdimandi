import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export const ACTIVE_QUEUE_STATUSES = ["waiting", "notified"];
export const LAST_QUEUE_ENTRY_KEY = "nahdi-mandi:lastQueueEntryId";

function mapDocs(snapshot) {
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function createQueueEntry({ name, phone, partySize, ownerUid }) {
  const queueRef = doc(collection(db, "queue"));
  const queuePublicRef = doc(db, "queue_public", queueRef.id);
  const batch = writeBatch(db);

  batch.set(queueRef, {
    name,
    phone,
    partySize,
    status: "waiting",
    timestamp: serverTimestamp(),
    ownerUid,
    fcmToken: null,
    fcmTokenUpdatedAt: null,
  });

  batch.set(queuePublicRef, {
    partySize,
    status: "waiting",
    timestamp: serverTimestamp(),
  });

  await batch.commit();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LAST_QUEUE_ENTRY_KEY, queueRef.id);
  }

  return queueRef.id;
}

export function subscribeToQueueEntry(entryId, onNext, onError) {
  return onSnapshot(doc(db, "queue", entryId), onNext, onError);
}

export function subscribeToActiveQueue(onNext, onError) {
  const activeQueueQuery = query(
    collection(db, "queue_public"),
    where("status", "in", ACTIVE_QUEUE_STATUSES),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(
    activeQueueQuery,
    (snapshot) => onNext(mapDocs(snapshot)),
    onError
  );
}

export function subscribeToAdminQueue(onNext, onError) {
  const adminQueueQuery = query(
    collection(db, "queue"),
    where("status", "in", ACTIVE_QUEUE_STATUSES),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(
    adminQueueQuery,
    (snapshot) => onNext(mapDocs(snapshot)),
    onError
  );
}

export async function updateQueueStatus(entryId, status) {
  const batch = writeBatch(db);

  batch.update(doc(db, "queue", entryId), { status });
  batch.update(doc(db, "queue_public", entryId), { status });

  await batch.commit();
}

export async function bumpDownQueueEntry(entryId, currentEntries, bumpCount) {
  const currentIndex = currentEntries.findIndex((e) => e.id === entryId);
  if (currentIndex === -1) return;

  const batch = writeBatch(db);
  const targetIndex = currentIndex + bumpCount;
  
  let newTimestamp;
  if (targetIndex < currentEntries.length) {
    const targetEntry = currentEntries[targetIndex];
    if (targetEntry.timestamp && typeof targetEntry.timestamp.toDate === "function") {
      newTimestamp = new Date(targetEntry.timestamp.toDate().getTime() + 10);
    } else {
      newTimestamp = serverTimestamp();
    }
  } else {
    newTimestamp = serverTimestamp();
  }

  batch.update(doc(db, "queue", entryId), { timestamp: newTimestamp });
  batch.update(doc(db, "queue_public", entryId), { timestamp: newTimestamp });

  await batch.commit();
}

export async function getQueueHistoryByDate(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const historyQuery = query(
    collection(db, "queue"),
    where("timestamp", ">=", start),
    where("timestamp", "<=", end),
    orderBy("timestamp", "asc")
  );
  
  const snapshot = await getDocs(historyQuery);
  return mapDocs(snapshot);
}
