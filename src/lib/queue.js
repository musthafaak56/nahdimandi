import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db, isPasswordUser, waitForInitialAuth } from "./firebase";
import { getRestaurantDateKey } from "./time";
import {
  DEFAULT_STORE_LOCATION_MODE,
  getStoreLocation,
  normalizeStoreLocationMode,
} from "../../shared/storeLocations";
import { calculateDistanceMeters } from "./geofence";

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

function getQueueCounterRef(queueDate) {
  return doc(db, "queue_counters", queueDate);
}

function getQueueSettingsRef() {
  return doc(db, "settings", "queue");
}

function buildLocationSnapshot(location, storeLocation) {
  if (!location) {
    return null;
  }

  const latitude = Number(location.lat);
  const longitude = Number(location.lng);
  const accuracyMeters = Number(location.accuracyMeters || 0);
  const distanceMeters = calculateDistanceMeters(
    latitude,
    longitude,
    storeLocation.latitude,
    storeLocation.longitude
  );

  return {
    lat: latitude,
    lng: longitude,
    accuracyMeters,
    distanceMeters,
    withinRadius: distanceMeters <= storeLocation.radiusMeters,
    storeMode: storeLocation.mode,
    storeName: storeLocation.name,
  };
}

async function createQueueEntryViaTransaction({
  name,
  phone,
  partySize,
  location,
  joinSource,
  storeLocation,
  ownerUid,
}) {
  const queueDate = getRestaurantDateKey();
  const queueRef = doc(collection(db, "customers_per_day", queueDate, "entries"));

  const entry = await runTransaction(db, async (transaction) => {
    const [counterSnapshot] = await Promise.all([
      transaction.get(getQueueCounterRef(queueDate)),
    ]);

    const normalizedLocation =
      joinSource === "public" ? buildLocationSnapshot(location, storeLocation) : null;

    if (joinSource === "public" && !normalizedLocation?.withinRadius) {
      const distanceError = new Error(
        `Queue check-in is only available within 2.5 km of ${storeLocation.name}.`
      );
      distanceError.code = "failed-precondition";
      throw distanceError;
    }

    const lastQueueNumber = counterSnapshot.exists()
      ? Number(counterSnapshot.data()?.lastQueueNumber || 0)
      : 0;
    const queueNumber = lastQueueNumber + 1;
    const counterData = {
      lastQueueNumber: queueNumber,
      lastEntryId: queueRef.id,
      lastOwnerUid: ownerUid,
      updatedAt: serverTimestamp(),
    };
    const queueData = {
      name,
      phone,
      partySize,
      queueDate,
      queueNumber,
      status: "waiting",
      timestamp: serverTimestamp(),
      ownerUid,
      fcmToken: null,
      fcmTokenUpdatedAt: null,
      joinSource,
      locationMode: storeLocation.mode,
      storeName: storeLocation.name,
      location: normalizedLocation,
      tableReadyLocation: null,
      tableReadyCheckedAt: null,
      respondedAt: null,
    };
    const queuePublicData = {
      partySize,
      queueDate,
      queueNumber,
      status: "waiting",
      timestamp: serverTimestamp(),
    };

    transaction.set(getQueueCounterRef(queueDate), counterData, { merge: true });
    transaction.set(queueRef, queueData);
    transaction.set(getQueuePublicRef(queueRef.id), queuePublicData);

    return {
      id: queueRef.id,
      queueDate,
      queueNumber,
    };
  });

  return entry;
}

export async function createQueueEntry({
  name,
  phone,
  partySize,
  location = null,
  persistLocal = true,
}) {
  const user = auth?.currentUser ?? (await waitForInitialAuth());

  if (!user) {
    throw new Error("You must be signed in before creating a queue entry.");
  }

  const locationMode = normalizeStoreLocationMode(
    (await getDoc(getQueueSettingsRef())).data()?.locationMode || DEFAULT_STORE_LOCATION_MODE
  );
  const storeLocation = getStoreLocation(locationMode);
  const joinSource = isPasswordUser(user) ? "admin" : "public";
  const normalizedLocation =
    joinSource === "public" ? buildLocationSnapshot(location, storeLocation) : null;

  if (joinSource === "public" && !normalizedLocation?.withinRadius) {
    const distanceError = new Error(
      `Queue check-in is only available within 2.5 km of ${storeLocation.name}.`
    );
    distanceError.code = "failed-precondition";
    throw distanceError;
  }

  const entry = await createQueueEntryViaTransaction({
    name,
    phone,
    partySize,
    location: normalizedLocation,
    joinSource,
    storeLocation,
    ownerUid: user.uid,
  });

  if (persistLocal && typeof window !== "undefined") {
    window.localStorage.setItem(
      LAST_QUEUE_ENTRY_KEY,
      JSON.stringify({ id: entry.id, queueDate: entry.queueDate })
    );
  }

  return entry;
}

export async function confirmTableReadyArrival(entryId, queueDate, location) {
  const user = auth?.currentUser ?? (await waitForInitialAuth());

  if (!user) {
    throw new Error("You must be signed in before updating your location.");
  }

  const entryRef = getCustomerEntryRef(queueDate, entryId);
  const entrySnapshot = await getDoc(entryRef);

  if (!entrySnapshot.exists()) {
    const notFoundError = new Error("That queue entry could not be found.");
    notFoundError.code = "not-found";
    throw notFoundError;
  }

  const entry = entrySnapshot.data();

  if (!isPasswordUser(user) && entry.ownerUid !== user.uid) {
    const permissionError = new Error("You do not have permission to update this queue entry.");
    permissionError.code = "permission-denied";
    throw permissionError;
  }

  if (entry.status !== "notified") {
    const statusError = new Error("Table-ready location can only be checked after notification.");
    statusError.code = "failed-precondition";
    throw statusError;
  }

  const storeLocation = getStoreLocation(
    normalizeStoreLocationMode(entry.locationMode || DEFAULT_STORE_LOCATION_MODE)
  );
  const normalizedLocation = buildLocationSnapshot(location, storeLocation);

  await updateDoc(entryRef, {
    tableReadyLocation: normalizedLocation,
    tableReadyCheckedAt: serverTimestamp(),
    respondedAt: normalizedLocation.withinRadius ? serverTimestamp() : null,
  });

  return {
    withinRadius: normalizedLocation.withinRadius,
    distanceMeters: normalizedLocation.distanceMeters,
  };
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
    getQueueSettingsRef(),
    (snapshot) => {
      if (snapshot.exists()) {
        onNext(snapshot.data());
      } else {
        onNext({
          notifiedTimeoutSeconds: 30,
          locationMode: DEFAULT_STORE_LOCATION_MODE,
        });
      }
    },
    onError
  );
}

export async function updateQueueSettings(settings) {
  await setDoc(getQueueSettingsRef(), settings, { merge: true });
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
    updates.tableReadyLocation = null;
    updates.tableReadyCheckedAt = null;
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
