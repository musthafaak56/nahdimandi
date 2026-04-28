import { startTransition, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import StatusBadge from "../components/StatusBadge";
import { getFriendlyError } from "../lib/errors";
import { ensureAnonymousSession } from "../lib/firebase";
import { subscribeToForegroundMessages, requestQueueNotifications } from "../lib/notifications";
import { playReadyChime } from "../lib/sound";
import { formatClock, toMillis } from "../lib/time";
import { bumpDownQueueEntry, ACTIVE_QUEUE_STATUSES, subscribeToQueueEntry, subscribeToActiveQueue } from "../lib/queue";

function StatusPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get("id");
  const [entry, setEntry] = useState(null);
  const [queueEntries, setQueueEntries] = useState([]);
  const [error, setError] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [showReadyOverlay, setShowReadyOverlay] = useState(true);
  const [notificationState, setNotificationState] = useState("idle");
  const [pushMessage, setPushMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [wasAutoBumped, setWasAutoBumped] = useState(false);
  const previousStatusRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationState("granted");
    } else if (Notification.permission === "denied") {
      setNotificationState("denied");
    }
  }, []);

  useEffect(() => {
    if (!entryId) {
      setError("Missing queue reference.");
      setIsBooting(false);
      return;
    }

    let isActive = true;
    let unsubscribeEntry = () => {};
    let unsubscribeQueue = () => {};

    ensureAnonymousSession()
      .then(() => {
        if (!isActive) {
          return;
        }

        unsubscribeEntry = subscribeToQueueEntry(
          entryId,
          (snapshot) => {
            if (!snapshot.exists()) {
              setError("That queue entry could not be found.");
              setIsBooting(false);
              return;
            }

            startTransition(() => {
              setEntry({
                id: snapshot.id,
                ...snapshot.data(),
              });
              setIsBooting(false);
            });
          },
          (snapshotError) => {
            if (!isActive) {
              return;
            }

            setError(getFriendlyError(snapshotError, "We could not load your queue status."));
            setIsBooting(false);
          }
        );

        unsubscribeQueue = subscribeToActiveQueue(
          (activeQueue) => {
            if (!isActive) {
              return;
            }

            startTransition(() => {
              setQueueEntries(activeQueue);
            });
          },
          (queueError) => {
            if (!isActive) {
              return;
            }

            setError(getFriendlyError(queueError, "We could not sync the queue."));
          }
        );
      })
      .catch((sessionError) => {
        if (!isActive) {
          return;
        }

        setError(
          getFriendlyError(
            sessionError,
            "We could not restore this queue session on this device."
          )
        );
        setIsBooting(false);
      });

    return () => {
      isActive = false;
      unsubscribeEntry();
      unsubscribeQueue();
    };
  }, [entryId]);

  useEffect(() => {
    let unsubscribe = () => {};
    let isActive = true;

    subscribeToForegroundMessages((payload) => {
      const queueId = payload?.data?.queueId;

      if (queueId === entryId) {
        setPushMessage(payload?.notification?.title || "Your table is ready.");
      }
    }).then((nextUnsubscribe) => {
      if (isActive) {
        unsubscribe = nextUnsubscribe;
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [entryId]);

  useEffect(() => {
    const status = entry?.status;

    if (!status) {
      return;
    }

    if (status === "notified" && previousStatusRef.current !== "notified") {
      setShowReadyOverlay(true);
      playReadyChime().catch(() => {});
      setWasAutoBumped(false);
    }

    previousStatusRef.current = status;
  }, [entry?.status]);

  useEffect(() => {
    if (entry?.status !== "notified" || !entry?.notifiedAt || entry?.respondedAt) {
      setTimeLeft(null);
      return;
    }

    const startMillis = toMillis(entry.notifiedAt);
    const timeoutSeconds = entry.notifiedTimeoutSeconds || 30;
    const endMillis = startMillis + timeoutSeconds * 1000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endMillis - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        handleAutoBump();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [entry?.status, entry?.notifiedAt, entry?.respondedAt, entry?.notifiedTimeoutSeconds]);

  async function handleAutoBump() {
    if (entry?.status !== "notified" || entry?.respondedAt) return;
    
    try {
      await bumpDownQueueEntry(entry.id, queueEntries, 2, { 
        status: "waiting",
        notifiedAt: null,
        notifiedTimeoutSeconds: null
      });
      setWasAutoBumped(true);
      setShowReadyOverlay(false);
    } catch (err) {
      console.error("Auto bump failed:", err);
    }
  }



  async function enableNotifications() {
    if (!entryId) {
      return;
    }

    setNotificationState("requesting");

    try {
      const result = await requestQueueNotifications(entryId);
      setNotificationState(result.status);
    } catch (notificationError) {
      setNotificationState("error");
      setError(
        getFriendlyError(
          notificationError,
          "Notifications could not be enabled on this browser."
        )
      );
    }
  }

  if (isBooting) {
    return <LoadingScreen label="Syncing your place in line..." />;
  }

  const positionIndex = queueEntries.findIndex((item) => item.id === entryId);
  const position = positionIndex >= 0 ? positionIndex + 1 : null;
  const activeCount = queueEntries.length;
  const isActiveStatus = ACTIVE_QUEUE_STATUSES.includes(entry?.status);
  const partiesAhead = position ? position - 1 : 0;
  const progress = isActiveStatus && activeCount > 0 && position
    ? ((activeCount - partiesAhead) / activeCount) * 100
    : entry?.status === "notified"
      ? 100
      : 0;

  let statusHeadline = "We are confirming your place in the queue.";
  let statusBody =
    "This page stays live, so you can check your position without refreshing.";

  if (entry?.status === "waiting") {
    statusHeadline = position ? `You are #${position} in line.` : "You are in the queue.";
    statusBody = position === null
      ? "We're calculating your live position right now."
      : position && partiesAhead > 0
        ? `${partiesAhead} ${partiesAhead === 1 ? "party is" : "parties are"} ahead of you right now.`
        : "You are next in line once a table is ready.";
  }

  if (entry?.status === "notified") {
    statusHeadline = "Your table is ready.";
    statusBody = "Please come to the front desk now.";
  }

  if (entry?.status === "seated") {
    statusHeadline = "You have been marked as seated.";
    statusBody = "Enjoy your meal. If you still need help, speak to the front desk.";
  }

  if (entry?.status === "cancelled") {
    statusHeadline = "This queue entry has been removed.";
    statusBody = "If you still need a table, you can rejoin the queue.";
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute left-[-6rem] top-16 h-56 w-56 rounded-full bg-ember/12 blur-3xl" />
      <div className="absolute right-[-3rem] top-1/3 h-44 w-44 rounded-full bg-brass/25 blur-3xl" />

      {entry?.status === "notified" && showReadyOverlay ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg overflow-hidden border-2 border-emerald-500/30 p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-3xl text-emerald-700">
              *
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
              Table ready
            </p>
            <h1 className="mt-3 font-display text-4xl text-ink">
              Your table is ready.
            </h1>
            <p className="mt-4 text-base leading-7 text-ink/75">
              Please come to the front desk now. {timeLeft !== null ? (
                <span className="block mt-2 font-bold text-emerald-700 animate-pulse">
                  Head to the desk within {timeLeft} seconds to keep your spot!
                </span>
              ) : "This alert stays on until you are seated."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="glass-panel overflow-hidden p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-clove/70">
                Live queue status
              </p>
              <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
                {statusHeadline}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/74">
                {statusBody}
              </p>
            </div>
            {entry ? <StatusBadge status={entry.status} /> : null}
          </div>

          {entry ? (
            <div className="mt-8">
              <div className="rounded-[1.5rem] border border-stone-900/10 bg-white/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clove/70">
                  Guest
                </p>
                <p className="mt-2 text-xl font-semibold text-ink">{entry.name}</p>
              </div>
            </div>
          ) : null}
        </header>

        {error ? (
          <section className="glass-panel p-6">
            <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-rose-700">
              {error}
            </div>
            <Link to="/join" className="warm-button mt-6">
              Join the queue again
            </Link>
          </section>
        ) : null}

        {wasAutoBumped ? (
          <section className="glass-panel p-6 animate-fadeSlide">
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-amber-800">
              <h3 className="font-bold text-lg">You missed your turn</h3>
              <p className="mt-2">
                Since you didn't respond within the time limit, your position has been moved back. 
                Please keep this page open and head to the desk as soon as you are notified again.
              </p>
            </div>
            <button 
              className="warm-button mt-4"
              onClick={() => setWasAutoBumped(false)}
            >
              Got it
            </button>
          </section>
        ) : null}

        {!error && entry ? (
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="glass-panel p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-clove/70">
                Position tracker
              </p>
              <div className="mt-5 flex flex-wrap items-end gap-4">
                <p className="font-display text-6xl text-ink">
                  {entry.status === "notified" ? "Now" : position || "--"}
                </p>
                <div className="pb-2">
                  <p className="text-sm uppercase tracking-[0.24em] text-clove/70">
                    Current spot
                  </p>
                  <p className="mt-2 text-base text-ink/72">
                    {entry.status === "waiting" && position
                      ? `${partiesAhead} ${partiesAhead === 1 ? "party" : "parties"} ahead`
                      : entry.status === "notified"
                        ? "You should head to the desk now."
                        : "Queue tracking ended."}
                  </p>
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-full bg-white/65">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-brass via-ember to-clove transition-all duration-500"
                  style={{ width: `${Math.max(progress, 6)}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink/70">
                <span>{activeCount} active parties in the queue</span>
                {isActiveStatus && position ? (
                  <span>
                    You are moving as soon as tables ahead are seated.
                  </span>
                ) : (
                  <span>We will keep this page updated in real time.</span>
                )}
              </div>
            </div>

            <div className="glass-panel p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-clove/70">
                Alerts
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink">
                Stay notified even in the background.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink/74">
                Browser push works on Android browsers and desktop. On iPhone,
                keep this page open because Safari does not support Firebase web
                push in the same way.
              </p>

              <div className="mt-6 rounded-[1.5rem] border border-stone-900/10 bg-white/60 p-5">
                <p className="text-sm font-semibold text-ink/80">
                  {notificationState === "granted"
                    ? "Alerts are enabled for this queue entry."
                    : "Allow notifications to get a table-ready alert."}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  {notificationState === "unsupported"
                    ? "This browser cannot receive Firebase push notifications."
                    : notificationState === "denied"
                      ? "Permission was denied. You can re-enable it from browser settings."
                      : "You will still see live updates on this page even without push."}
                </p>

                <button
                  type="button"
                  className="warm-button mt-5 w-full justify-center"
                  onClick={enableNotifications}
                  disabled={
                    notificationState === "requesting" || notificationState === "granted"
                  }
                >
                  {notificationState === "requesting"
                    ? "Enabling notifications..."
                    : notificationState === "granted"
                      ? "Notifications enabled"
                      : "Enable browser alerts"}
                </button>
              </div>

              {pushMessage || location.state?.justJoined ? (
                <div className="mt-6 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">
                  {pushMessage ||
                    "You're in the queue! We'll notify you when your table is ready."}
                </div>
              ) : null}

              <Link to="/join" className="mt-6 inline-flex text-sm font-semibold text-clove transition hover:text-ember">
                Need another request? Start a new queue entry
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default StatusPage;
