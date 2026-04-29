import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerCredits from "../components/CustomerCredits";
import LoadingScreen from "../components/LoadingScreen";
import { getFriendlyError } from "../lib/errors";
import { ensureAnonymousSession } from "../lib/firebase";
import { createQueueEntry, LAST_QUEUE_ENTRY_KEY } from "../lib/queue";

const PHONE_PATTERN = /^\+?[0-9\-\s]{8,15}$/;

function JoinPage() {
  const navigate = useNavigate();
  const [ownerUid, setOwnerUid] = useState("");
  const [resumeQueueEntry, setResumeQueueEntry] = useState(null);
  const [error, setError] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    partySize: 2,
  });

  useEffect(() => {
    let active = true;

    ensureAnonymousSession()
      .then((user) => {
        if (!active) {
          return;
        }

        setOwnerUid(user.uid);
        const storedEntry = window.localStorage.getItem(LAST_QUEUE_ENTRY_KEY);

        if (!storedEntry) {
          setResumeQueueEntry(null);
          return;
        }

        try {
          const parsedEntry = JSON.parse(storedEntry);
          setResumeQueueEntry(parsedEntry?.id && parsedEntry?.queueDate ? parsedEntry : null);
        } catch {
          setResumeQueueEntry(null);
        }
      })
      .catch((sessionError) => {
        if (!active) {
          return;
        }

        setError(
          getFriendlyError(
            sessionError,
            "We could not start your queue session. Refresh and try again."
          )
        );
      })
      .finally(() => {
        if (active) {
          setIsBooting(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedName = form.name.trim();
    const trimmedPhone = form.phone.trim();

    if (trimmedName.length < 2) {
      setError("Please enter the guest name.");
      return;
    }

    if (!PHONE_PATTERN.test(trimmedPhone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    if (!ownerUid) {
      setError("Your session is still loading. Try again in a moment.");
      return;
    }

    setIsSubmitting(true);

    try {
      const entry = await createQueueEntry({
        name: trimmedName,
        phone: trimmedPhone,
        partySize: Number(form.partySize),
        ownerUid,
      });

      navigate(`/status?id=${entry.id}&date=${entry.queueDate}`, {
        replace: true,
        state: { justJoined: true },
      });
    } catch (submitError) {
      setError(
        getFriendlyError(
          submitError,
          "We could not save your queue request. Try again."
        )
      );
      setIsSubmitting(false);
    }
  }

  if (isBooting) {
    return <LoadingScreen label="Preparing your queue form..." />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute left-[-4rem] top-24 h-40 w-40 rounded-full bg-brass/20 blur-3xl" />
      <div className="absolute right-[-5rem] top-[-2rem] h-52 w-52 rounded-full bg-ember/15 blur-3xl" />

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="px-2 pt-6 sm:px-4 lg:pr-6">
          <p className="font-body text-sm font-semibold uppercase tracking-[0.32em] text-clove/70">
            Nahdi Mandi
          </p>
          <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.02] text-ink sm:text-6xl">
            Join the table queue without the WhatsApp back-and-forth.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink/74">
            Check in once, track your place live, and get a free browser alert
            when your table is ready.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="glass-panel p-5">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.24em] text-clove/70">
                Live updates
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/75">
                Your position updates automatically as tables open up.
              </p>
            </div>
            <div className="glass-panel p-5">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.24em] text-clove/70">
                Free alerts
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/75">
                Turn on browser notifications for a table-ready ping.
              </p>
            </div>
            <div className="glass-panel p-5">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.24em] text-clove/70">
                iPhone fallback
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/75">
                Keep the status page open on iPhone for live in-page updates.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-panel relative overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-ember/50 to-transparent" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-clove/70">
                Queue check-in
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink">
                Add your party in under a minute.
              </h2>
            </div>
            {resumeQueueEntry ? (
              <Link
                to={`/status?id=${resumeQueueEntry.id}&date=${resumeQueueEntry.queueDate}`}
                className="rounded-full border border-stone-900/10 bg-white/70 px-4 py-2 text-sm font-semibold text-clove transition hover:border-ember/40 hover:text-ember"
              >
                Resume status
              </Link>
            ) : null}
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink/80">
                Guest name
              </span>
              <input
                className="field-input"
                type="text"
                placeholder="Amina"
                autoComplete="name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink/80">
                Phone number
              </span>
              <input
                className="field-input"
                type="tel"
                placeholder="+91 9X XXX XXXXX"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </label>

            <div className="rounded-[1.5rem] border border-stone-900/10 bg-white/55 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink/80">Party size</p>
                  <p className="mt-1 text-sm text-ink/60">
                    Choose between 1 and 20 guests.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-900/10 bg-white/80 text-xl text-clove transition hover:border-ember/40 hover:text-ember"
                    onClick={() =>
                      updateField("partySize", Math.max(1, Number(form.partySize) - 1))
                    }
                  >
                    -
                  </button>
                  <input
                    className="h-11 w-16 rounded-full border border-stone-900/10 bg-white/80 text-center text-lg font-semibold text-ink outline-none focus:border-ember/40"
                    type="number"
                    min="1"
                    max="20"
                    value={form.partySize}
                    onChange={(event) =>
                      updateField(
                        "partySize",
                        Math.min(20, Math.max(1, Number(event.target.value || 1)))
                      )
                    }
                  />
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-900/10 bg-white/80 text-xl text-clove transition hover:border-ember/40 hover:text-ember"
                    onClick={() =>
                      updateField("partySize", Math.min(20, Number(form.partySize) + 1))
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button type="submit" className="warm-button w-full py-4 text-base" disabled={isSubmitting}>
              {isSubmitting ? "Adding your party..." : "Join the queue"}
            </button>
          </form>
        </section>
      </div>

      <CustomerCredits />
    </main>
  );
}

export default JoinPage;
