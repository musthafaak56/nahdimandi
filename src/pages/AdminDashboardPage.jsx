import { startTransition, useDeferredValue, useEffect, useState } from "react";
import QueueCard from "../components/QueueCard";
import SummaryBar from "../components/SummaryBar";
import { useAuthState } from "../components/AuthProvider";
import { signOutCurrentUser } from "../lib/firebase";
import { getFriendlyError } from "../lib/errors";
import AdminContactView from "../components/AdminContactView";
import AdminHistoryView from "../components/AdminHistoryView";
import { normalizePhoneNumber } from "../lib/phone";
import { formatDistanceMeters } from "../lib/geofence";
import {
  createQueueEntry,
  subscribeToAdminQueue, 
  updateQueueStatus, 
  bumpDownQueueEntry,
  subscribeToQueueSettings,
  updateQueueSettings
} from "../lib/queue";
import {
  DEFAULT_TEST_STORE_LOCATION,
  DEFAULT_STORE_LOCATION_MODE,
  getStoreLocation,
  normalizeStoreLocationMode,
} from "../../shared/storeLocations";

const PHONE_PATTERN = /^\d{10}$/;

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value || min)));
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  inputClassName = "",
  buttonClassName = "",
}) {
  const currentValue = clampNumber(value, min, max);

  return (
    <div className="flex items-center overflow-hidden rounded-2xl border border-admin-line bg-admin-base/70">
      <button
        type="button"
        className={`flex h-12 w-11 items-center justify-center border-r border-admin-line/70 text-lg font-semibold transition hover:bg-admin-line/20 focus:outline-none focus:ring-4 focus:ring-admin-cyan/10 ${buttonClassName}`}
        onClick={() => onChange(clampNumber(currentValue - step, min, max))}
        aria-label="Decrease value"
      >
        -
      </button>
      <input
        className={`h-12 min-w-0 flex-1 border-0 bg-transparent px-2 text-center text-base text-admin-text outline-none ${inputClassName}`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(clampNumber(event.target.value, min, max))}
      />
      <button
        type="button"
        className={`flex h-12 w-11 items-center justify-center border-l border-admin-line/70 text-lg font-semibold transition hover:bg-admin-line/20 focus:outline-none focus:ring-4 focus:ring-admin-cyan/10 ${buttonClassName}`}
        onClick={() => onChange(clampNumber(currentValue + step, min, max))}
        aria-label="Increase value"
      >
        +
      </button>
    </div>
  );
}

function AdminDashboardPage() {
  const { user } = useAuthState();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [activeTab, setActiveTab] = useState("live");
  const [bumpDownCount, setBumpDownCount] = useState(3);
  const [notifiedTimeout, setNotifiedTimeout] = useState(30);
  const [bumpDownDraft, setBumpDownDraft] = useState(3);
  const [timeoutDraft, setTimeoutDraft] = useState(30);
  const [locationMode, setLocationMode] = useState(DEFAULT_STORE_LOCATION_MODE);
  const [queueSettings, setQueueSettings] = useState({});
  const [adminForm, setAdminForm] = useState({
    name: "",
    phone: "",
    partySize: 2,
  });
  const [isAddingParty, setIsAddingParty] = useState(false);
  const [isSavingBumpDown, setIsSavingBumpDown] = useState(false);
  const [isSavingTimeout, setIsSavingTimeout] = useState(false);
  const [isSavingLocationMode, setIsSavingLocationMode] = useState(false);
  const [isEditingTestLocation, setIsEditingTestLocation] = useState(false);
  const [isSavingTestLocation, setIsSavingTestLocation] = useState(false);
  const [testLocationDraft, setTestLocationDraft] = useState({
    latitude: DEFAULT_TEST_STORE_LOCATION.latitude,
    longitude: DEFAULT_TEST_STORE_LOCATION.longitude,
    radiusMeters: DEFAULT_TEST_STORE_LOCATION.radiusMeters,
  });
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [showSecretLocationModal, setShowSecretLocationModal] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAdminQueue(
      (nextEntries) => {
        startTransition(() => {
          setEntries(nextEntries);
          setError("");
        });
      },
      (queueError) => {
        setError(getFriendlyError(queueError, "The live queue could not be loaded."));
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToQueueSettings(
      (settings) => {
        const nextSettings = settings || {};
        setQueueSettings(nextSettings);
        const nextTimeout = nextSettings.notifiedTimeoutSeconds || 30;
        setNotifiedTimeout(nextTimeout);
        setTimeoutDraft(nextTimeout);
        setLocationMode(normalizeStoreLocationMode(nextSettings.locationMode));
        setTestLocationDraft({
          latitude:
            Number.isFinite(Number(nextSettings.testLocationLatitude))
              ? Number(nextSettings.testLocationLatitude)
              : DEFAULT_TEST_STORE_LOCATION.latitude,
          longitude:
            Number.isFinite(Number(nextSettings.testLocationLongitude))
              ? Number(nextSettings.testLocationLongitude)
              : DEFAULT_TEST_STORE_LOCATION.longitude,
          radiusMeters:
            Number.isFinite(Number(nextSettings.testLocationRadiusMeters)) &&
            Number(nextSettings.testLocationRadiusMeters) > 0
              ? Number(nextSettings.testLocationRadiusMeters)
              : DEFAULT_TEST_STORE_LOCATION.radiusMeters,
        });
      },
      (settingsError) => {
        console.error("Failed to load settings:", settingsError);
      }
    );

    return unsubscribe;
  }, []);

  async function handleSaveBumpDown() {
    setError("");
    setIsSavingBumpDown(true);

    try {
      setBumpDownCount(Math.min(20, Math.max(1, Number(bumpDownDraft || 1))));
    } catch (err) {
      setError("Failed to save push-down setting.");
    } finally {
      setIsSavingBumpDown(false);
    }
  }

  async function handleUpdateTimeout() {
    const nextTimeout = Math.min(300, Math.max(10, Number(timeoutDraft || 10)));
    setError("");
    setIsSavingTimeout(true);

    try {
      await updateQueueSettings({ notifiedTimeoutSeconds: nextTimeout });
      setNotifiedTimeout(nextTimeout);
      setTimeoutDraft(nextTimeout);
    } catch (err) {
      setError("Failed to save timeout setting.");
    } finally {
      setIsSavingTimeout(false);
    }
  }

  async function handleUpdateLocationMode(nextMode) {
    const normalizedMode = normalizeStoreLocationMode(nextMode);
    setError("");
    setIsSavingLocationMode(true);

    try {
      await updateQueueSettings({ locationMode: normalizedMode });
      setLocationMode(normalizedMode);
      closeSecretLocationModal();
    } catch (err) {
      setError("Failed to switch queue location mode.");
    } finally {
      setIsSavingLocationMode(false);
    }
  }

  function handleTestLocationDraftChange(field, value) {
    setTestLocationDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetTestLocationDraft() {
    setTestLocationDraft({
      latitude:
        Number.isFinite(Number(queueSettings.testLocationLatitude))
          ? Number(queueSettings.testLocationLatitude)
          : DEFAULT_TEST_STORE_LOCATION.latitude,
      longitude:
        Number.isFinite(Number(queueSettings.testLocationLongitude))
          ? Number(queueSettings.testLocationLongitude)
          : DEFAULT_TEST_STORE_LOCATION.longitude,
      radiusMeters:
        Number.isFinite(Number(queueSettings.testLocationRadiusMeters)) &&
        Number(queueSettings.testLocationRadiusMeters) > 0
          ? Number(queueSettings.testLocationRadiusMeters)
          : DEFAULT_TEST_STORE_LOCATION.radiusMeters,
    });
  }

  function openSecretLocationModal() {
    resetTestLocationDraft();
    setIsEditingTestLocation(true);
    setShowSecretLocationModal(true);
  }

  function closeSecretLocationModal() {
    setShowSecretLocationModal(false);
    setIsEditingTestLocation(false);
    setSecretTapCount(0);
  }

  async function handleSaveTestLocation() {
    const latitude = Number(testLocationDraft.latitude);
    const longitude = Number(testLocationDraft.longitude);
    const radiusMeters = Number(testLocationDraft.radiusMeters);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Enter valid latitude and longitude values.");
      return;
    }

    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      setError("Enter a radius greater than 0 meters.");
      return;
    }

    setError("");
    setIsSavingTestLocation(true);

    try {
      await updateQueueSettings({
        testLocationLatitude: latitude,
        testLocationLongitude: longitude,
        testLocationRadiusMeters: radiusMeters,
      });
      setQueueSettings((current) => ({
        ...current,
        testLocationLatitude: latitude,
        testLocationLongitude: longitude,
        testLocationRadiusMeters: radiusMeters,
      }));
      closeSecretLocationModal();
    } catch (saveError) {
      setError(
        getFriendlyError(saveError, "Failed to save the test location settings.")
      );
    } finally {
      setIsSavingTestLocation(false);
    }
  }

  async function handleAction(entryId, status) {
    setBusyAction(`${entryId}:${status}`);
    setError("");
    const currentEntry = deferredEntries.find((entry) => entry.id === entryId);

    try {
      if (status === "bumpDown") {
        await bumpDownQueueEntry(entryId, deferredEntries, bumpDownCount, {
          status: "waiting",
          notifiedAt: null,
          notifiedTimeoutSeconds: null,
          respondedAt: null,
          tableReadyLocation: null,
          tableReadyCheckedAt: null,
        });
      } else if (status === "notified") {
        await updateQueueStatus(entryId, status, {
          notifiedTimeoutSeconds: notifiedTimeout,
          queueDate: currentEntry?.queueDate,
        });
      } else {
        await updateQueueStatus(entryId, status, {
          queueDate: currentEntry?.queueDate,
        });
      }
    } catch (actionError) {
      setError(
        getFriendlyError(
          actionError,
          "The queue item could not be updated. Try again."
        )
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleSignOut() {
    await signOutCurrentUser();
  }

  function updateAdminForm(field, value) {
    setAdminForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleAddParty(event) {
    event.preventDefault();
    setError("");

    const trimmedName = adminForm.name.trim();
    const trimmedPhone = normalizePhoneNumber(adminForm.phone.trim());
    const partySize = Number(adminForm.partySize);

    if (trimmedName.length < 2) {
      setError("Enter a guest name before adding the party.");
      return;
    }

    if (!PHONE_PATTERN.test(trimmedPhone)) {
      setError("Enter a 10-digit phone number for the walk-in party.");
      return;
    }

    if (!user?.uid) {
      setError("Admin session is not ready yet. Try again in a moment.");
      return;
    }

    setIsAddingParty(true);

    try {
      await createQueueEntry({
        name: trimmedName,
        phone: trimmedPhone,
        partySize,
        persistLocal: false,
      });

      setSecretTapCount(0);

      setAdminForm({
        name: "",
        phone: "",
        partySize: 2,
      });
    } catch (addError) {
      setError(
        getFriendlyError(addError, "The party could not be added to the queue.")
      );
    } finally {
      setIsAddingParty(false);
    }
  }

  function handleAddPartyButtonClick() {
    if (isAddingParty) {
      return;
    }

    setSecretTapCount((current) => {
      const nextCount = current + 1;

      if (nextCount >= 8) {
        openSecretLocationModal();
        return 0;
      }

      return nextCount;
    });
  }

  const deferredEntries = useDeferredValue(entries);
  const waitingEntries = deferredEntries.filter((entry) => entry.status === "waiting");
  const totalPartiesInQueue = deferredEntries.length;
  const nextUp = waitingEntries[0] || deferredEntries[0] || null;
  const activeStoreLocation = getStoreLocation(locationMode, queueSettings);

  return (
    <main className="min-h-screen bg-admin-base px-4 py-6 text-admin-text sm:px-6 lg:px-8">
      {showSecretLocationModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-admin-base/75 px-4 backdrop-blur-sm">
          <div className="admin-panel w-full max-w-2xl p-6 sm:p-7">
            <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-cyan">
              Queue location mode
            </p>
            <h2 className="mt-3 font-admin text-3xl font-bold text-admin-text">
              Switch test or production
            </h2>
            <p className="mt-4 text-sm leading-7 text-admin-mute">
              This changes which store location new public queue joins use for the
              geofence. Existing queue entries keep the mode they were created with.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <button
                type="button"
                className="admin-button w-full justify-between bg-admin-cyan/12 text-admin-text ring-1 ring-admin-cyan/25 hover:bg-admin-cyan/18 focus:ring-admin-cyan/20"
                onClick={() => handleUpdateLocationMode("test")}
                disabled={isSavingLocationMode}
              >
                <span>Use Test Location</span>
                <span className="text-xs uppercase tracking-[0.22em] text-admin-cyan">
                  {locationMode === "test" ? "Active" : "Tap to switch"}
                </span>
              </button>
              <button
                type="button"
                className="admin-button w-full justify-between bg-white/10 text-admin-text ring-1 ring-white/15 hover:bg-white/16 focus:ring-white/10"
                onClick={() => handleUpdateLocationMode("production")}
                disabled={isSavingLocationMode}
              >
                <span>Use Production Location</span>
                <span className="text-xs uppercase tracking-[0.22em] text-admin-cyan">
                  {locationMode === "production" ? "Active" : "Tap to switch"}
                </span>
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-admin-line/40 bg-admin-base/55 p-4 text-sm text-admin-mute">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-admin-text">Test location</p>
                  <p className="mt-1">
                    Active radius: {formatDistanceMeters(activeStoreLocation.radiusMeters)}
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-button bg-white/10 px-4 py-2 text-xs text-admin-text ring-1 ring-white/15 hover:bg-white/16 focus:ring-white/10"
                  onClick={() => {
                    if (isEditingTestLocation) {
                      resetTestLocationDraft();
                    }
                    setIsEditingTestLocation((current) => !current);
                  }}
                  disabled={isSavingLocationMode || isSavingTestLocation}
                >
                  {isEditingTestLocation ? "Cancel edit" : "Edit"}
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-admin-mute">
                    Latitude
                  </span>
                  <input
                    className="w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3 text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10 disabled:cursor-not-allowed disabled:opacity-55"
                    type="number"
                    step="0.000001"
                    value={testLocationDraft.latitude}
                    onChange={(event) =>
                      handleTestLocationDraftChange("latitude", event.target.value)
                    }
                    disabled={!isEditingTestLocation || isSavingTestLocation}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-admin-mute">
                    Longitude
                  </span>
                  <input
                    className="w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3 text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10 disabled:cursor-not-allowed disabled:opacity-55"
                    type="number"
                    step="0.000001"
                    value={testLocationDraft.longitude}
                    onChange={(event) =>
                      handleTestLocationDraftChange("longitude", event.target.value)
                    }
                    disabled={!isEditingTestLocation || isSavingTestLocation}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-admin-mute">
                    Radius (m)
                  </span>
                  <input
                    className="w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3 text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10 disabled:cursor-not-allowed disabled:opacity-55"
                    type="number"
                    min="1"
                    step="1"
                    value={testLocationDraft.radiusMeters}
                    onChange={(event) =>
                      handleTestLocationDraftChange("radiusMeters", event.target.value)
                    }
                    disabled={!isEditingTestLocation || isSavingTestLocation}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-admin-mute">
                  Current values are saved in Firestore and used for test mode joins.
                </p>
                <button
                  type="button"
                  className="admin-button bg-admin-cyan/15 px-4 py-2 text-xs text-admin-cyan ring-1 ring-admin-cyan/30 hover:bg-admin-cyan/22 focus:ring-admin-cyan/20 disabled:cursor-not-allowed disabled:opacity-55"
                  onClick={handleSaveTestLocation}
                  disabled={!isEditingTestLocation || isSavingTestLocation}
                >
                  {isSavingTestLocation ? "Saving..." : "Save test location"}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="admin-button mt-6 w-full bg-admin-text text-admin-base hover:bg-white focus:ring-white/10"
              onClick={closeSecretLocationModal}
              disabled={isSavingLocationMode}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-admin-line/70 bg-[radial-gradient(circle_at_top_left,_rgba(126,213,168,0.15),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(82,199,234,0.18),_transparent_28%),linear-gradient(145deg,_rgba(16,24,32,1)_0%,_rgba(20,33,44,1)_52%,_rgba(12,18,27,1)_100%)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-admin text-sm font-semibold uppercase tracking-[0.3em] text-admin-cyan">
                Nahdi Mandi
              </p>
              <h1 className="mt-3 font-admin text-4xl font-bold tracking-tight sm:text-5xl">
                Live queue dashboard
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-admin-mute">
                Watch the queue in real time, send table-ready alerts, and seat
                the next party without reloading.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-admin-line/80 bg-admin-base/65 px-4 py-2 text-sm text-admin-mute">
                Signed in as {user?.email || "admin"}
              </div>
              <button
                type="button"
                className="admin-button bg-admin-text text-admin-base hover:bg-white focus:ring-white/10"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <div className="flex border-b border-admin-line/40">
          <button
            className={`px-6 py-3 font-admin text-sm font-semibold uppercase tracking-wider ${
              activeTab === "live"
                ? "border-b-2 border-admin-cyan text-admin-cyan"
                : "text-admin-mute hover:text-admin-text"
            }`}
            onClick={() => setActiveTab("live")}
          >
            Live Queue
          </button>
          <button
            className={`px-6 py-3 font-admin text-sm font-semibold uppercase tracking-wider ${
              activeTab === "history"
                ? "border-b-2 border-admin-cyan text-admin-cyan"
                : "text-admin-mute hover:text-admin-text"
            }`}
            onClick={() => setActiveTab("history")}
          >
            History & Analytics
          </button>
          <button
            className={`px-6 py-3 font-admin text-sm font-semibold uppercase tracking-wider ${
              activeTab === "contact"
                ? "border-b-2 border-admin-cyan text-admin-cyan"
                : "text-admin-mute hover:text-admin-text"
            }`}
            onClick={() => setActiveTab("contact")}
          >
            Contact
          </button>
        </div>

        {activeTab === "history" ? (
          <AdminHistoryView />
        ) : activeTab === "contact" ? (
          <AdminContactView />
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
              <form
                className="admin-panel p-5 sm:p-6"
                onSubmit={handleAddParty}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-cyan">
                      Add walk-in
                    </p>
                    <h2 className="mt-2 font-admin text-2xl font-bold text-admin-text">
                      Put a party straight into the queue
                    </h2>
                  </div>
                  <button
                    type="submit"
                    className="admin-button bg-admin-cyan text-admin-base hover:bg-[#76d4f0] focus:ring-admin-cyan/20"
                    disabled={isAddingParty}
                    onClick={handleAddPartyButtonClick}
                  >
                    {isAddingParty ? "Adding..." : "Add party"}
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_1fr_140px]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-admin-mute">
                      Guest name
                    </span>
                    <input
                      className="w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3 text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10"
                      type="text"
                      value={adminForm.name}
                      onChange={(event) => updateAdminForm("name", event.target.value)}
                      placeholder="Walk-in guest"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-admin-mute">
                      Phone
                    </span>
                    <input
                      className="w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3 text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10"
                      type="tel"
                      value={adminForm.phone}
                      onChange={(event) => updateAdminForm("phone", event.target.value)}
                      placeholder="8281851282"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-admin-mute">
                      Party size
                    </span>
                    <NumberStepper
                      value={adminForm.partySize}
                      min={1}
                      max={20}
                      onChange={(nextValue) => updateAdminForm("partySize", nextValue)}
                    />
                  </label>
                </div>
              </form>

              <SummaryBar
                totalWaiting={waitingEntries.length}
                totalPartiesInQueue={totalPartiesInQueue}
                nextUp={nextUp}
              />

              <div className="admin-panel flex flex-col gap-4 p-5 sm:p-6">
                <div className="rounded-xl border border-admin-line/30 bg-admin-base/50 p-4">
                  <label className="text-sm font-medium text-admin-mute">
                    Push down no-shows by
                  </label>
                  <div className="mt-3 flex items-center gap-3">
                    <NumberStepper
                      value={bumpDownDraft}
                      min={1}
                      max={20}
                      onChange={setBumpDownDraft}
                      inputClassName="font-admin"
                      buttonClassName="text-amber-500"
                    />
                    <span className="text-sm text-admin-mute">parties</span>
                    <button
                      type="button"
                      className="admin-button bg-amber-500/15 px-3 py-2 text-xs text-amber-500 ring-1 ring-amber-500/30 hover:bg-amber-500/22 focus:ring-amber-500/20"
                      onClick={handleSaveBumpDown}
                      disabled={isSavingBumpDown}
                    >
                      {isSavingBumpDown ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-admin-line/30 bg-admin-base/50 p-4">
                  <label className="text-sm font-medium text-admin-mute">
                    Queue geofence mode
                  </label>
                  <div className="mt-3 rounded-2xl border border-admin-line/40 bg-admin-base/60 px-4 py-3 text-sm text-admin-text">
                    <span className="font-semibold capitalize">{locationMode}</span>
                    {` · ${activeStoreLocation.name}`}
                  </div>
                </div>

                <div className="rounded-xl border border-admin-line/30 bg-admin-base/50 p-4">
                  <label className="text-sm font-medium text-admin-mute">
                    Response timeout
                  </label>
                  <div className="mt-3 flex items-center gap-3">
                    <NumberStepper
                      value={timeoutDraft}
                      min={10}
                      max={300}
                      step={10}
                      onChange={setTimeoutDraft}
                      inputClassName="font-admin"
                      buttonClassName="text-admin-cyan"
                    />
                    <span className="text-sm text-admin-mute">sec</span>
                    <button
                      type="button"
                      className="admin-button bg-admin-cyan/15 px-3 py-2 text-xs text-admin-cyan ring-1 ring-admin-cyan/30 hover:bg-admin-cyan/22 focus:ring-admin-cyan/20"
                      onClick={handleUpdateTimeout}
                      disabled={isSavingTimeout}
                    >
                      {isSavingTimeout ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {error ? (
              <div className="rounded-[1.5rem] border border-admin-rose/25 bg-admin-rose/10 px-5 py-4 text-sm text-admin-rose">
                {error}
              </div>
            ) : null}

            <section className="space-y-4">
              {deferredEntries.length ? (
                deferredEntries.map((entry, index) => (
                  <QueueCard
                    key={entry.id}
                    entry={entry}
                    position={index + 1}
                    busyAction={Boolean(busyAction)}
                    onAction={handleAction}
                  />
                ))
              ) : (
                <div className="admin-panel p-10 text-center">
                  <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-mute">
                    Queue clear
                  </p>
                  <h2 className="mt-3 font-admin text-3xl font-bold text-admin-text">
                    No active parties right now.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-admin-mute">
                    New queue entries will appear here automatically as customers join.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default AdminDashboardPage;
