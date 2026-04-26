import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import QueueCard from "../components/QueueCard";
import SummaryBar from "../components/SummaryBar";
import { useAuthState } from "../components/AuthProvider";
import { auth } from "../lib/firebase";
import { getFriendlyError } from "../lib/errors";
import { subscribeToAdminQueue, updateQueueStatus } from "../lib/queue";

function AdminDashboardPage() {
  const { user } = useAuthState();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");

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

  async function handleAction(entryId, status) {
    setBusyAction(`${entryId}:${status}`);
    setError("");

    try {
      await updateQueueStatus(entryId, status);
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

        <SummaryBar
          totalWaiting={waitingEntries.length}
          totalPartySize={totalPartySize}
          nextUp={nextUp}
        />

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
      </div>
    </main>
  );
}

export default AdminDashboardPage;
