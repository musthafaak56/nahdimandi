import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { getRestaurantDateKey } from "./time";

export const ACTIVE_QUEUE_STATUSES = ["waiting", "notified"];
export const LAST_QUEUE_ENTRY_KEY = "nahdi-mandi:lastQueueEntryId";

function mapDocs(snapshot) {
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

function getCustomerEntryRef(queueDate, queueId) {
  return doc(db, "customers_per_day", queueDate, "entries", queueId);
}

function getQueuePublicRef(queueId) {
  return doc(db, "queue_public", queueId);
}

export async function createQueueEntry({
  name,
  phone,
  partySize,
  ownerUid,
  persistLocal = true,
}) {
  const queueDate = getRestaurantDateKey();
  const queueRef = doc(collection(db, "customers_per_day", queueDate, "entries"));
  const batch = writeBatch(db);
  const queueData = {
    name,
    phone,
    partySize,
    queueDate,
    status: "waiting",
    timestamp: serverTimestamp(),
    ownerUid,
    fcmToken: null,
    fcmTokenUpdatedAt: null,
  };
  const queuePublicData = {
    partySize,
    queueDate,
    status: "waiting",
    timestamp: serverTimestamp(),
  };

  batch.set(queueRef, queueData);
  batch.set(getQueuePublicRef(queueRef.id), queuePublicData);
  await batch.commit();

  if (persistLocal && typeof window !== "undefined") {
    window.localStorage.setItem(
      LAST_QUEUE_ENTRY_KEY,
      JSON.stringify({ id: queueRef.id, queueDate })
    );
  }

  return { id: queueRef.id, queueDate };
}

export function subscribeToQueueEntry(queueDate, entryId, onNext, onError) {
  return onSnapshot(getCustomerEntryRef(queueDate, entryId), onNext, onError);
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
  const todayKey = getRestaurantDateKey();
  const adminQueueQuery = query(
    collection(db, "customers_per_day", todayKey, "entries"),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(
    adminQueueQuery,
    (snapshot) =>
      onNext(
        mapDocs(snapshot).filter((entry) =>
          ACTIVE_QUEUE_STATUSES.includes(entry.status)
        )
      ),
    onError
  );
}

export function subscribeToQueueSettings(onNext, onError) {
  return onSnapshot(
    doc(db, "settings", "queue"),
    (snapshot) => {
      if (snapshot.exists()) {
        onNext(snapshot.data());
      } else {
        onNext({ notifiedTimeoutSeconds: 30 });
      }
    },
    onError
  );
}

export async function updateQueueSettings(settings) {
  await setDoc(doc(db, "settings", "queue"), settings, { merge: true });
}

export async function updateQueueStatus(entryId, status, options = {}) {
  const queueDate = options.queueDate;

  if (!queueDate) {
    throw new Error("queueDate is required to update queue status.");
  }

  const batch = writeBatch(db);
  const updates = { status };

  if (status === "notified") {
    updates.notifiedAt = serverTimestamp();
    updates.notifiedTimeoutSeconds = options.notifiedTimeoutSeconds || 30;
    updates.respondedAt = null;
  }

  if (status === "seated" || status === "cancelled") {
    updates.respondedAt = serverTimestamp();
  }

  batch.update(getCustomerEntryRef(queueDate, entryId), updates);
  batch.update(getQueuePublicRef(entryId), updates);
  await batch.commit();
}

export async function acknowledgeNotification(entryId, queueDate) {
  if (!queueDate) {
    throw new Error("queueDate is required to acknowledge notifications.");
  }

  const updates = { respondedAt: serverTimestamp() };
  const batch = writeBatch(db);

  batch.update(getCustomerEntryRef(queueDate, entryId), updates);
  batch.update(getQueuePublicRef(entryId), updates);
  await batch.commit();
}

export async function bumpDownQueueEntry(
  entryId,
  currentEntries,
  bumpCount,
  extraUpdates = {}
) {
  const currentEntry = currentEntries.find((entry) => entry.id === entryId);
  const currentIndex = currentEntries.findIndex((entry) => entry.id === entryId);

  if (currentIndex === -1 || !currentEntry?.queueDate) {
    return;
  }

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
    ...extraUpdates,
  };

  batch.update(getCustomerEntryRef(currentEntry.queueDate, entryId), updates);
  batch.update(getQueuePublicRef(entryId), updates);
  await batch.commit();
}

export async function deleteQueueEntryPermanently(entry) {
  const queueId = entry.queueId || entry.id;
  const queueDate = entry.queueDate;
  const batch = writeBatch(db);

  if (queueDate) {
    batch.delete(getCustomerEntryRef(queueDate, queueId));
  }
  batch.delete(getQueuePublicRef(queueId));

  await batch.commit();
}

export async function getQueueHistoryByDate(date) {
  const datedCollectionQuery = query(
    collection(db, "customers_per_day", date, "entries"),
    orderBy("timestamp", "asc")
  );

  const datedCollectionSnapshot = await getDocs(datedCollectionQuery);
  return mapDocs(datedCollectionSnapshot);
}
