import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import QueueCard from "../components/QueueCard";
import SummaryBar from "../components/SummaryBar";
import { useAuthState } from "../components/AuthProvider";
import { auth } from "../lib/firebase";
import { getFriendlyError } from "../lib/errors";
import AdminHistoryView from "../components/AdminHistoryView";
import { 
  createQueueEntry,
  subscribeToAdminQueue, 
  updateQueueStatus, 
  bumpDownQueueEntry,
  subscribeToQueueSettings,
  updateQueueSettings
} from "../lib/queue";

const PHONE_PATTERN = /^\+?[0-9\-\s]{8,15}$/;

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
  const [adminForm, setAdminForm] = useState({
    name: "",
    phone: "",
    partySize: 2,
  });
  const [isAddingParty, setIsAddingParty] = useState(false);
  const [isSavingBumpDown, setIsSavingBumpDown] = useState(false);
  const [isSavingTimeout, setIsSavingTimeout] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAdminQueue(
      (nextEntries) => {
        startTransition(() => {
          setEntries(nextEntries);
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
        const nextTimeout = settings.notifiedTimeoutSeconds || 30;
        setNotifiedTimeout(nextTimeout);
        setTimeoutDraft(nextTimeout);
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

  async function handleAction(entryId, status) {
    setBusyAction(`${entryId}:${status}`);
    setError("");
    const currentEntry = deferredEntries.find((entry) => entry.id === entryId);

    try {
      if (status === "bumpDown") {
        await bumpDownQueueEntry(entryId, deferredEntries, bumpDownCount);
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
    await signOut(auth);
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
    const trimmedPhone = adminForm.phone.trim();
    const partySize = Number(adminForm.partySize);

    if (trimmedName.length < 2) {
      setError("Enter a guest name before adding the party.");
      return;
    }

    if (!PHONE_PATTERN.test(trimmedPhone)) {
      setError("Enter a valid phone number for the walk-in party.");
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
        ownerUid: user.uid,
        persistLocal: false,
      });

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

  const deferredEntries = useDeferredValue(entries);
  const waitingEntries = deferredEntries.filter((entry) => entry.status === "waiting");
  const totalPartySize = deferredEntries.reduce(
    (total, entry) => total + Number(entry.partySize || 0),
    0
  );
  const nextUp = waitingEntries[0] || deferredEntries[0] || null;

  return (
    <main className="min-h-screen bg-admin-base px-4 py-6 text-admin-text sm:px-6 lg:px-8">
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
        </div>

        {activeTab === "history" ? (
          <AdminHistoryView />
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
                      placeholder="+91 9X XXX XXXXX"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-admin-mute">
                      Party size
                    </span>
                    <input
                      className="w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3 text-center text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10"
                      type="number"
                      min="1"
                      max="20"
                      value={adminForm.partySize}
                      onChange={(event) =>
                        updateAdminForm(
                          "partySize",
                          Math.min(20, Math.max(1, Number(event.target.value || 1)))
                        )
                      }
                    />
                  </label>
                </div>
              </form>

              <SummaryBar
                totalWaiting={waitingEntries.length}
                totalPartySize={totalPartySize}
                nextUp={nextUp}
              />

              <div className="admin-panel flex flex-col gap-4 p-5 sm:p-6">
                <div className="rounded-xl border border-admin-line/30 bg-admin-base/50 p-4">
                  <label className="text-sm font-medium text-admin-mute">
                    Push down no-shows by
                  </label>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={bumpDownDraft}
                      onChange={(e) =>
                        setBumpDownDraft(
                          Math.min(20, Math.max(1, Number(e.target.value || 1)))
                        )
                      }
                      className="w-20 rounded border border-admin-line/50 bg-admin-base py-2 px-2 text-center font-admin text-admin-text outline-none focus:border-amber-500"
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
                    Response timeout
                  </label>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="10"
                      value={timeoutDraft}
                      onChange={(e) =>
                        setTimeoutDraft(
                          Math.min(300, Math.max(10, Number(e.target.value || 10)))
                        )
                      }
                      className="w-20 rounded border border-admin-line/50 bg-admin-base py-2 px-2 text-center font-admin text-admin-text outline-none focus:border-admin-cyan"
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
