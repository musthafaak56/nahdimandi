import { DEFAULT_STORE_LOCATION_MODE, DEFAULT_TEST_STORE_LOCATION, getStoreLocation, normalizeStoreLocationMode } from "../../shared/storeLocations";
import { getRestaurantDateKey } from "./time";

const DEFAULT_ADMIN_CREDENTIALS = {
  email: "admin@nahdi.test",
  password: "password123",
};

function clone(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function toDate(value, fallback = new Date()) {
  if (!value) {
    return fallback instanceof Date ? new Date(fallback.getTime()) : new Date(fallback);
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed;
}

function normalizeLocation(location, storeLocation) {
  if (!location) {
    return null;
  }

  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const accuracyMeters = Number(location.accuracyMeters || 0);
  const distanceMeters = Number(location.distanceMeters || 0);
  const withinRadius =
    typeof location.withinRadius === "boolean"
      ? location.withinRadius
      : distanceMeters <= storeLocation.radiusMeters;

  return {
    lat,
    lng,
    accuracyMeters,
    distanceMeters,
    withinRadius,
    storeMode: location.storeMode || storeLocation.mode,
    storeName: location.storeName || storeLocation.name,
  };
}

function buildDefaultQueueSettings() {
  return {
    notifiedTimeoutSeconds: 30,
    locationMode: DEFAULT_STORE_LOCATION_MODE,
    testLocationLatitude: DEFAULT_TEST_STORE_LOCATION.latitude,
    testLocationLongitude: DEFAULT_TEST_STORE_LOCATION.longitude,
    testLocationRadiusMeters: DEFAULT_TEST_STORE_LOCATION.radiusMeters,
  };
}

function buildUser({
  uid,
  email = "",
  displayName = "",
  isAnonymous = false,
  providerId = isAnonymous ? "anonymous" : "password",
} = {}) {
  return {
    uid,
    email,
    displayName,
    isAnonymous,
    providerData: [{ providerId }],
  };
}

function makeSnapshot(id, data) {
  return {
    id,
    exists: () => Boolean(data),
    data: () => clone(data),
  };
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const aTime = toDate(a.timestamp).getTime();
    const bTime = toDate(b.timestamp).getTime();

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return Number(a.queueNumber || 0) - Number(b.queueNumber || 0);
  });
}

function createEntryState(seedEntry, state) {
  const queueDate = seedEntry.queueDate || state.dateKey;
  const storeLocation = getStoreLocation(
    normalizeStoreLocationMode(seedEntry.locationMode || state.queueSettings.locationMode),
    state.queueSettings
  );
  const baseLocation = seedEntry.location
    ? normalizeLocation(seedEntry.location, storeLocation)
    : null;
  const entry = {
    id: seedEntry.id,
    name: seedEntry.name || "Guest",
    phone: seedEntry.phone || "",
    partySize: Number(seedEntry.partySize || 2),
    queueDate,
    queueNumber: Number(seedEntry.queueNumber || 1),
    status: seedEntry.status || "waiting",
    timestamp: toDate(seedEntry.timestamp || new Date()),
    ownerUid: seedEntry.ownerUid || state.auth.anonymousUser.uid,
    joinSource: seedEntry.joinSource || "public",
    locationMode: seedEntry.locationMode || state.queueSettings.locationMode,
    storeName: seedEntry.storeName || storeLocation.name,
    location: baseLocation,
    tableReadyLocation: seedEntry.tableReadyLocation
      ? normalizeLocation(seedEntry.tableReadyLocation, storeLocation)
      : null,
    tableReadyCheckedAt: seedEntry.tableReadyCheckedAt
      ? toDate(seedEntry.tableReadyCheckedAt)
      : null,
    respondedAt: seedEntry.respondedAt ? toDate(seedEntry.respondedAt) : null,
    notifiedAt: seedEntry.notifiedAt ? toDate(seedEntry.notifiedAt) : null,
    notifiedTimeoutSeconds:
      Number(seedEntry.notifiedTimeoutSeconds || state.queueSettings.notifiedTimeoutSeconds || 30),
    fcmToken: seedEntry.fcmToken || null,
    fcmTokenUpdatedAt: seedEntry.fcmTokenUpdatedAt ? toDate(seedEntry.fcmTokenUpdatedAt) : null,
  };

  if (entry.status !== "notified") {
    entry.notifiedAt = null;
    entry.notifiedTimeoutSeconds = null;
  }

  if (entry.status !== "seated" && entry.status !== "cancelled") {
    entry.respondedAt = null;
  }

  return entry;
}

function createSupportTicketState(seedTicket, state) {
  return {
    id: seedTicket.id,
    subject: seedTicket.subject || "Support ticket",
    message: seedTicket.message || "",
    contactPhone: seedTicket.contactPhone || "",
    portfolioUrl: seedTicket.portfolioUrl || "",
    ticketToEmail: seedTicket.ticketToEmail || "musthafaak56@gmail.com",
    fromUid: seedTicket.fromUid || state.auth.adminUser.uid,
    fromEmail: seedTicket.fromEmail || state.auth.adminUser.email,
    fromDisplayName: seedTicket.fromDisplayName || state.auth.adminUser.displayName,
    status: seedTicket.status || "open",
    createdAt: toDate(seedTicket.createdAt || new Date()),
    updatedAt: toDate(seedTicket.updatedAt || new Date()),
    resolvedAt: seedTicket.resolvedAt ? toDate(seedTicket.resolvedAt) : null,
  };
}

function createState(seed = {}) {
  const queueSettings = {
    ...buildDefaultQueueSettings(),
    ...(seed.queueSettings || {}),
  };
  const dateKey = seed.dateKey || getRestaurantDateKey();
  const state = {
    dateKey,
    queueSettings,
    auth: {
      currentUser: seed.currentUser ?? null,
      anonymousUser: buildUser({
        uid: seed.anonymousUid || "e2e-anonymous",
        isAnonymous: true,
      }),
      adminUser: buildUser({
        uid: seed.adminUid || "e2e-admin",
        email: seed.adminCredentials?.email || DEFAULT_ADMIN_CREDENTIALS.email,
        displayName: seed.adminDisplayName || "Test Admin",
        isAnonymous: false,
        providerId: "password",
      }),
      adminCredentials: {
        ...DEFAULT_ADMIN_CREDENTIALS,
        ...(seed.adminCredentials || {}),
      },
      listeners: new Set(),
    },
    queueEntriesByDate: new Map(),
    supportTicketsById: new Map(),
    queueSettingsListeners: new Set(),
    queueEntryListeners: new Map(),
    activeQueueListeners: new Map(),
    adminQueueListeners: new Set(),
    supportTicketListeners: new Set(),
    nextQueueId: 1,
    nextTicketId: 1,
  };

  const seedEntries = Array.isArray(seed.queueEntries) ? seed.queueEntries : [];
  seedEntries.forEach((seedEntry) => {
    const entry = createEntryState(
      {
        ...seedEntry,
        id: seedEntry.id || `queue-${state.nextQueueId++}`,
      },
      state
    );

    if (!state.queueEntriesByDate.has(entry.queueDate)) {
      state.queueEntriesByDate.set(entry.queueDate, new Map());
    }

    state.queueEntriesByDate.get(entry.queueDate).set(entry.id, entry);
  });

  state.nextQueueId =
    seedEntries.length > 0
      ? seedEntries.length + 1
      : 1;

  const seedTickets = Array.isArray(seed.supportTickets) ? seed.supportTickets : [];
  seedTickets.forEach((seedTicket, index) => {
    const ticket = createSupportTicketState(
      {
        ...seedTicket,
        id: seedTicket.id || `ticket-${index + 1}`,
      },
      state
    );
    state.supportTicketsById.set(ticket.id, ticket);
  });

  state.nextTicketId = seedTickets.length > 0 ? seedTickets.length + 1 : 1;

  return state;
}

function getRuntimeRoot() {
  if (typeof window === "undefined") {
    return null;
  }

  const root = window.__NAHDI_E2E__;
  if (!root || !root.enabled) {
    return null;
  }

  if (!root.state) {
    root.state = createState(root.seed || {});
  }

  return root;
}

function getState() {
  return getRuntimeRoot()?.state || null;
}

function getQueueEntriesForDate(state, dateKey) {
  const entries = state.queueEntriesByDate.get(dateKey);
  return sortEntries(entries ? Array.from(entries.values()) : []);
}

function getActiveQueueForDate(state, dateKey) {
  return getQueueEntriesForDate(state, dateKey).filter((entry) =>
    ["waiting", "notified"].includes(entry.status)
  );
}

function emitAuthState(state) {
  state.auth.listeners.forEach((listener) => listener(state.auth.currentUser));
}

function emitQueueSettings(state) {
  state.queueSettingsListeners.forEach((listener) => listener(clone(state.queueSettings)));
}

function emitQueueDate(state, dateKey) {
  const activeQueue = getActiveQueueForDate(state, dateKey);
  const entries = getQueueEntriesForDate(state, dateKey);

  (state.activeQueueListeners.get(dateKey) || new Set()).forEach((listener) => {
    listener(clone(activeQueue));
  });

  (state.adminQueueListeners || new Set()).forEach((listener) => {
    listener(clone(activeQueue));
  });

  entries.forEach((entry) => {
    const key = `${dateKey}:${entry.id}`;
    (state.queueEntryListeners.get(key) || new Set()).forEach((listener) => {
      listener(makeSnapshot(entry.id, entry));
    });
  });
}

function emitQueueEntry(state, dateKey, entryId) {
  const entry = state.queueEntriesByDate.get(dateKey)?.get(entryId) || null;
  const key = `${dateKey}:${entryId}`;
  (state.queueEntryListeners.get(key) || new Set()).forEach((listener) => {
    listener(makeSnapshot(entryId, entry));
  });
}

function emitSupportTickets(state) {
  const tickets = sortEntries(Array.from(state.supportTicketsById.values())).reverse();
  state.supportTicketListeners.forEach((listener) => listener(clone(tickets)));
}

function updateEntry(state, dateKey, entryId, updates = {}) {
  const dateEntries = state.queueEntriesByDate.get(dateKey);
  if (!dateEntries || !dateEntries.has(entryId)) {
    return null;
  }

  const current = dateEntries.get(entryId);
  const nextEntry = {
    ...current,
    ...updates,
  };

  if (updates.location) {
    nextEntry.location = normalizeLocation(
      updates.location,
      getStoreLocation(normalizeStoreLocationMode(nextEntry.locationMode), state.queueSettings)
    );
  }

  if (updates.tableReadyLocation) {
    nextEntry.tableReadyLocation = normalizeLocation(
      updates.tableReadyLocation,
      getStoreLocation(normalizeStoreLocationMode(nextEntry.locationMode), state.queueSettings)
    );
  }

  if (updates.timestamp) {
    nextEntry.timestamp = toDate(updates.timestamp, nextEntry.timestamp);
  }

  if (updates.notifiedAt !== undefined) {
    nextEntry.notifiedAt = updates.notifiedAt ? toDate(updates.notifiedAt) : null;
  }

  if (updates.tableReadyCheckedAt !== undefined) {
    nextEntry.tableReadyCheckedAt = updates.tableReadyCheckedAt
      ? toDate(updates.tableReadyCheckedAt)
      : null;
  }

  if (updates.respondedAt !== undefined) {
    nextEntry.respondedAt = updates.respondedAt ? toDate(updates.respondedAt) : null;
  }

  if (updates.fcmTokenUpdatedAt !== undefined) {
    nextEntry.fcmTokenUpdatedAt = updates.fcmTokenUpdatedAt
      ? toDate(updates.fcmTokenUpdatedAt)
      : null;
  }

  dateEntries.set(entryId, nextEntry);
  emitQueueEntry(state, dateKey, entryId);
  emitQueueDate(state, dateKey);
  return nextEntry;
}

function removeEntry(state, dateKey, entryId) {
  const dateEntries = state.queueEntriesByDate.get(dateKey);
  if (!dateEntries) {
    return;
  }

  dateEntries.delete(entryId);
  emitQueueEntry(state, dateKey, entryId);
  emitQueueDate(state, dateKey);
}

export function isE2EMode() {
  return Boolean(getRuntimeRoot());
}

export function getE2ERuntime() {
  return getRuntimeRoot();
}

export function getE2EState() {
  return getState();
}

export function subscribeToE2EAuth(callback) {
  const state = getState();
  if (!state) {
    return () => {};
  }

  state.auth.listeners.add(callback);
  queueMicrotask(() => callback(state.auth.currentUser));

  return () => {
    state.auth.listeners.delete(callback);
  };
}

export async function signInAnonymousE2E() {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  state.auth.currentUser = state.auth.anonymousUser;
  emitAuthState(state);
  return state.auth.anonymousUser;
}

export async function signInPasswordE2E(email, password) {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (
    normalizedEmail !== state.auth.adminCredentials.email.toLowerCase() ||
    normalizedPassword !== state.auth.adminCredentials.password
  ) {
    const error = new Error("The admin email or password is incorrect.");
    error.code = "auth/invalid-login-credentials";
    throw error;
  }

  state.auth.currentUser = state.auth.adminUser;
  emitAuthState(state);
  return state.auth.adminUser;
}

export async function signOutE2E() {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  state.auth.currentUser = null;
  emitAuthState(state);
}

export function waitForE2EAuth() {
  const state = getState();
  return state ? Promise.resolve(state.auth.currentUser) : Promise.resolve(null);
}

export function getE2EQueueSettings() {
  const state = getState();
  return state ? clone(state.queueSettings) : null;
}

export function subscribeToE2EQueueSettings(onNext) {
  const state = getState();
  if (!state) {
    return () => {};
  }

  state.queueSettingsListeners.add(onNext);
  queueMicrotask(() => onNext(clone(state.queueSettings)));

  return () => {
    state.queueSettingsListeners.delete(onNext);
  };
}

export function updateE2EQueueSettings(updates) {
  const state = getState();
  if (!state) {
    return;
  }

  state.queueSettings = {
    ...state.queueSettings,
    ...clone(updates),
  };

  emitQueueSettings(state);
  emitQueueDate(state, state.dateKey);
}

export function createE2EQueueEntry({
  name,
  phone,
  partySize,
  location = null,
  persistLocal = true,
}) {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  const user = state.auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in before creating a queue entry.");
  }

  const queueDate = state.dateKey;
  const storeLocation = getStoreLocation(
    normalizeStoreLocationMode(state.queueSettings.locationMode),
    state.queueSettings
  );
  const joinSource = user.providerData?.some(({ providerId }) => providerId === "password")
    ? "admin"
    : "public";
  const normalizedLocation = location ? normalizeLocation(location, storeLocation) : null;

  if (joinSource === "public" && !normalizedLocation?.withinRadius) {
    const error = new Error(
      `Queue check-in is only available within ${Math.round(storeLocation.radiusMeters)} m of ${storeLocation.name}.`
    );
    error.code = "failed-precondition";
    throw error;
  }

  const id = `queue-${state.nextQueueId++}`;
  const entry = createEntryState(
    {
      id,
      name,
      phone,
      partySize,
      queueDate,
      queueNumber: getQueueEntriesForDate(state, queueDate).length + 1,
      status: "waiting",
      timestamp: new Date(),
      ownerUid: user.uid,
      joinSource,
      locationMode: storeLocation.mode,
      storeName: storeLocation.name,
      location: normalizedLocation,
    },
    state
  );

  if (!state.queueEntriesByDate.has(queueDate)) {
    state.queueEntriesByDate.set(queueDate, new Map());
  }

  state.queueEntriesByDate.get(queueDate).set(id, entry);
  emitQueueDate(state, queueDate);

  if (persistLocal && typeof window !== "undefined") {
    window.localStorage.setItem(
      "nahdi-mandi:lastQueueEntryId",
      JSON.stringify({ id, queueDate })
    );
  }

  return {
    id,
    queueDate,
    queueNumber: entry.queueNumber,
  };
}

export function subscribeToE2EQueueEntry(queueDate, entryId, onNext) {
  const state = getState();
  if (!state) {
    return () => {};
  }

  const key = `${queueDate}:${entryId}`;
  if (!state.queueEntryListeners.has(key)) {
    state.queueEntryListeners.set(key, new Set());
  }
  state.queueEntryListeners.get(key).add(onNext);
  queueMicrotask(() => {
    const entry = state.queueEntriesByDate.get(queueDate)?.get(entryId) || null;
    onNext(makeSnapshot(entryId, entry));
  });

  return () => {
    state.queueEntryListeners.get(key)?.delete(onNext);
  };
}

export function subscribeToE2EActiveQueue(queueDate, onNext) {
  const state = getState();
  if (!state) {
    return () => {};
  }

  if (!state.activeQueueListeners.has(queueDate)) {
    state.activeQueueListeners.set(queueDate, new Set());
  }

  state.activeQueueListeners.get(queueDate).add(onNext);
  queueMicrotask(() => onNext(clone(getActiveQueueForDate(state, queueDate))));

  return () => {
    state.activeQueueListeners.get(queueDate)?.delete(onNext);
  };
}

export function subscribeToE2EAdminQueue(onNext) {
  const state = getState();
  if (!state) {
    return () => {};
  }

  state.adminQueueListeners.add(onNext);
  queueMicrotask(() => onNext(clone(getActiveQueueForDate(state, state.dateKey))));

  return () => {
    state.adminQueueListeners.delete(onNext);
  };
}

export function subscribeToE2ESupportTickets(onNext) {
  const state = getState();
  if (!state) {
    return () => {};
  }

  state.supportTicketListeners.add(onNext);
  queueMicrotask(() => {
    const tickets = sortEntries(Array.from(state.supportTicketsById.values())).reverse();
    onNext(clone(tickets));
  });

  return () => {
    state.supportTicketListeners.delete(onNext);
  };
}

export function createE2ESupportTicket({
  subject,
  message,
  contactPhone,
  portfolioUrl,
  ticketToEmail = "musthafaak56@gmail.com",
}) {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  const user = state.auth.currentUser;
  if (!user || user.providerData?.every(({ providerId }) => providerId !== "password")) {
    throw new Error("Only admin users can send support tickets.");
  }

  const id = `ticket-${state.nextTicketId++}`;
  const ticket = createSupportTicketState(
    {
      id,
      subject: String(subject || "").trim(),
      message: String(message || "").trim(),
      contactPhone: String(contactPhone || "").trim(),
      portfolioUrl: String(portfolioUrl || "").trim(),
      ticketToEmail,
      fromUid: user.uid,
      fromEmail: user.email || "",
      fromDisplayName: user.displayName || "",
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    state
  );

  state.supportTicketsById.set(id, ticket);
  emitSupportTickets(state);
  return id;
}

export function updateE2ESupportTicketStatus(ticketId, status) {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  const ticket = state.supportTicketsById.get(ticketId);
  if (!ticket) {
    const error = new Error("That support ticket no longer exists.");
    error.code = "not-found";
    throw error;
  }

  ticket.status = status;
  ticket.updatedAt = new Date();
  ticket.resolvedAt = status === "resolved" ? new Date() : null;
  emitSupportTickets(state);
}

export async function requestE2ENotifications() {
  return { status: "granted", token: "e2e-token" };
}

export function subscribeToE2EForegroundMessages() {
  return Promise.resolve(() => {});
}

export async function confirmE2ETableReadyArrival(entryId, queueDate, location) {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  const dateEntries = state.queueEntriesByDate.get(queueDate);
  const entry = dateEntries?.get(entryId);
  if (!entry) {
    const error = new Error("That queue entry could not be found.");
    error.code = "not-found";
    throw error;
  }

  const user = state.auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in before updating your location.");
  }

  if (!user.isAnonymous && user.providerData?.some(({ providerId }) => providerId === "password")) {
    // Admin users can confirm any entry.
  } else if (entry.ownerUid !== user.uid) {
    const error = new Error("You do not have permission to update this queue entry.");
    error.code = "permission-denied";
    throw error;
  }

  if (entry.status !== "notified") {
    const error = new Error("Table-ready location can only be checked after notification.");
    error.code = "failed-precondition";
    throw error;
  }

  const storeLocation = getStoreLocation(
    normalizeStoreLocationMode(entry.locationMode || state.queueSettings.locationMode),
    state.queueSettings
  );
  const normalizedLocation = normalizeLocation(location, storeLocation);

  updateEntry(state, queueDate, entryId, {
    tableReadyLocation: normalizedLocation,
    tableReadyCheckedAt: new Date(),
    respondedAt: normalizedLocation.withinRadius ? new Date() : null,
  });

  return {
    withinRadius: normalizedLocation.withinRadius,
    distanceMeters: normalizedLocation.distanceMeters,
  };
}

export async function updateE2EQueueStatus(entryId, status, options = {}) {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  const queueDate = options.queueDate || state.dateKey;
  const current = state.queueEntriesByDate.get(queueDate)?.get(entryId);
  if (!current) {
    const error = new Error("That queue entry could not be found.");
    error.code = "not-found";
    throw error;
  }

  const updates = { status };

  if (status === "notified") {
    updates.notifiedAt = new Date();
    updates.notifiedTimeoutSeconds = options.notifiedTimeoutSeconds || 30;
    updates.respondedAt = null;
    updates.tableReadyLocation = null;
    updates.tableReadyCheckedAt = null;
  }

  if (status === "seated" || status === "cancelled") {
    updates.respondedAt = new Date();
  }

  updateEntry(state, queueDate, entryId, updates);
}

export async function bumpDownE2EQueueEntry(entryId, currentEntries, bumpCount, extraUpdates = {}) {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  const currentEntry = currentEntries.find((entry) => entry.id === entryId);
  const currentIndex = currentEntries.findIndex((entry) => entry.id === entryId);

  if (currentIndex === -1 || !currentEntry?.queueDate) {
    return;
  }

  const targetIndex = currentIndex + bumpCount;
  let nextTimestamp = new Date();
  if (targetIndex < currentEntries.length) {
    const targetEntry = currentEntries[targetIndex];
    const baseTime = toDate(targetEntry.timestamp).getTime();
    nextTimestamp = new Date(baseTime + 10);
  }

  updateEntry(state, currentEntry.queueDate, entryId, {
    timestamp: nextTimestamp,
    ...extraUpdates,
  });
}

export async function deleteE2EQueueEntryPermanently(entry) {
  const state = getState();
  if (!state) {
    throw new Error("E2E runtime is not active.");
  }

  const queueId = entry.queueId || entry.id;
  const queueDate = entry.queueDate || state.dateKey;
  removeEntry(state, queueDate, queueId);
}

export async function getE2EQueueHistoryByDate(date) {
  const state = getState();
  if (!state) {
    return [];
  }

  return clone(getQueueEntriesForDate(state, date));
}

export async function getE2EQueueHistoryPageByDate(
  date,
  { pageSize = 10, startAfterDoc = null, endBeforeDoc = null } = {}
) {
  const state = getState();
  if (!state) {
    return {
      entries: [],
      firstDoc: null,
      lastDoc: null,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  const entries = getQueueEntriesForDate(state, date);
  const startAfterId = startAfterDoc?.id || null;
  const endBeforeId = endBeforeDoc?.id || null;

  let startIndex = 0;
  let endIndex = entries.length;

  if (startAfterId) {
    const index = entries.findIndex((entry) => entry.id === startAfterId);
    startIndex = index >= 0 ? index + 1 : 0;
  } else if (endBeforeId) {
    const index = entries.findIndex((entry) => entry.id === endBeforeId);
    endIndex = index >= 0 ? index : entries.length;
  }

  const visibleEntries = entries.slice(startIndex, endIndex);
  const pageEntries = visibleEntries.slice(0, pageSize);
  const hasNextPage = startIndex + pageEntries.length < entries.length;
  const hasPreviousPage = Boolean(startAfterId || endBeforeId);

  return {
    entries: clone(pageEntries),
    firstDoc: pageEntries[0] || null,
    lastDoc: pageEntries[pageEntries.length - 1] || null,
    hasNextPage,
    hasPreviousPage,
  };
}

export async function getE2EAllQueueHistory() {
  const state = getState();
  if (!state) {
    return [];
  }

  const allEntries = Array.from(state.queueEntriesByDate.values()).flatMap((entries) =>
    Array.from(entries.values())
  );

  return clone(sortEntries(allEntries));
}
