import {
  collection,
  doc,
  documentId,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  where,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { getRestaurantDateKey, getRestaurantDateRange } from "./time";

export const ACTIVE_QUEUE_STATUSES = ["waiting", "notified"];
export const LAST_QUEUE_ENTRY_KEY = "nahdi-mandi:lastQueueEntryId";

function mapDocs(snapshot) {
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function createQueueEntry({
  name,
  phone,
  partySize,
  ownerUid,
  persistLocal = true,
}) {
  const queueRef = doc(collection(db, "queue"));
  const queuePublicRef = doc(db, "queue_public", queueRef.id);
  const batch = writeBatch(db);
  const queueDate = getRestaurantDateKey();

  batch.set(queueRef, {
    name,
    phone,
    partySize,
    queueDate,
    status: "waiting",
    timestamp: serverTimestamp(),
    ownerUid,
    fcmToken: null,
    fcmTokenUpdatedAt: null,
  });

  batch.set(queuePublicRef, {
    partySize,
    queueDate,
    status: "waiting",
    timestamp: serverTimestamp(),
  });

  await batch.commit();

  if (persistLocal && typeof window !== "undefined") {
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

export function subscribeToQueueSettings(onNext, onError) {
  return onSnapshot(doc(db, "settings", "queue"), (snapshot) => {
    if (snapshot.exists()) {
      onNext(snapshot.data());
    } else {
      onNext({ notifiedTimeoutSeconds: 30 });
    }
  }, onError);
}

export async function updateQueueSettings(settings) {
  await setDoc(doc(db, "settings", "queue"), settings, { merge: true });
}

export async function updateQueueStatus(entryId, status, options = {}) {
  const batch = writeBatch(db);
  const updates = { status };

  if (status === "notified") {
    updates.notifiedAt = serverTimestamp();
    updates.notifiedTimeoutSeconds = options.notifiedTimeoutSeconds || 30;
    updates.respondedAt = null;
  }

  batch.update(doc(db, "queue", entryId), updates);
  batch.update(doc(db, "queue_public", entryId), updates);

  await batch.commit();
}

export async function acknowledgeNotification(entryId) {
  const batch = writeBatch(db);
  const updates = { respondedAt: serverTimestamp() };

  batch.update(doc(db, "queue", entryId), updates);
  batch.update(doc(db, "queue_public", entryId), updates);

  await batch.commit();
}

export async function bumpDownQueueEntry(entryId, currentEntries, bumpCount, extraUpdates = {}) {
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

  const updates = { 
    timestamp: newTimestamp,
    ...extraUpdates 
  };

  batch.update(doc(db, "queue", entryId), updates);
  batch.update(doc(db, "queue_public", entryId), updates);

  await batch.commit();
}

export async function getQueueHistoryByDate(date) {
  const datedCollectionQuery = query(
    collection(db, "queue_by_date", date, "entries"),
    orderBy("timestamp", "asc")
  );

  const datedCollectionSnapshot = await getDocs(datedCollectionQuery);
  const datedCollectionEntries = mapDocs(datedCollectionSnapshot);
  const existingIds = new Set(datedCollectionEntries.map((entry) => entry.queueId || entry.id));

  const datedQuery = query(
    collection(db, "queue"),
    where("queueDate", "==", date),
    orderBy("timestamp", "asc")
  );

  const datedSnapshot = await getDocs(datedQuery);
  const datedEntries = mapDocs(datedSnapshot).filter((entry) => {
    if (existingIds.has(entry.id)) {
      return false;
    }

    existingIds.add(entry.id);
    return true;
  });

  const { start, end } = getRestaurantDateRange(date);

  const legacyQuery = query(
    collection(db, "queue"),
    where("timestamp", ">=", start),
    where("timestamp", "<=", end),
    orderBy("timestamp", "asc")
  );

  const legacySnapshot = await getDocs(legacyQuery);
  const missingLegacyIds = legacySnapshot.docs
    .map((document) => document.id)
    .filter((id) => !existingIds.has(id));

  if (missingLegacyIds.length === 0) {
    return [...datedCollectionEntries, ...datedEntries].sort((left, right) => {
      const leftMillis = typeof left.timestamp?.toMillis === "function" ? left.timestamp.toMillis() : 0;
      const rightMillis = typeof right.timestamp?.toMillis === "function" ? right.timestamp.toMillis() : 0;
      return leftMillis - rightMillis;
    });
  }

  const legacyBatches = [];

  for (let index = 0; index < missingLegacyIds.length; index += 10) {
    legacyBatches.push(missingLegacyIds.slice(index, index + 10));
  }

  const legacyResults = await Promise.all(
    legacyBatches.map((ids) =>
      getDocs(
        query(
          collection(db, "queue"),
          where(documentId(), "in", ids)
        )
      )
    )
  );

  const mergedEntries = [
    ...datedCollectionEntries,
    ...datedEntries,
    ...legacyResults.flatMap((snapshot) => mapDocs(snapshot)),
  ];

  return mergedEntries.sort((left, right) => {
    const leftMillis = typeof left.timestamp?.toMillis === "function" ? left.timestamp.toMillis() : 0;
    const rightMillis = typeof right.timestamp?.toMillis === "function" ? right.timestamp.toMillis() : 0;
    return leftMillis - rightMillis;
  });
}
