import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerCredits from "../components/CustomerCredits";
import LoadingScreen from "../components/LoadingScreen";
import { getFriendlyError } from "../lib/errors";
import { ensureAnonymousSession } from "../lib/firebase";
import {
  buildQueueJoinLocation,
  formatDistanceMeters,
  getCurrentPosition,
  getGeolocationErrorMessage,
} from "../lib/geofence";
import {
  createQueueEntry,
  LAST_QUEUE_ENTRY_KEY,
  subscribeToQueueSettings,
} from "../lib/queue";
import { normalizePhoneNumber } from "../lib/phone";
import {
  DEFAULT_STORE_LOCATION_MODE,
  getStoreLocation,
  normalizeStoreLocationMode,
} from "../../shared/storeLocations";

const PHONE_PATTERN = /^\d{10}$/;
const LOCATION_PROMPT_TIMEOUT_MS = 30000;

function JoinPage() {
  const navigate = useNavigate();
  const [ownerUid, setOwnerUid] = useState("");
  const [resumeQueueEntry, setResumeQueueEntry] = useState(null);
  const [locationPermission, setLocationPermission] = useState("unknown");
  const [locationMode, setLocationMode] = useState(DEFAULT_STORE_LOCATION_MODE);
  const [queueSettings, setQueueSettings] = useState({});
  const [error, setError] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationAccessNotice, setLocationAccessNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    partySize: 2,
  });
  const locationRequestTimeoutRef = useRef(null);
  const locationPermissionRef = useRef(locationPermission);
  const emptySubmitCountRef = useRef(0);

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

  useEffect(() => {
    if (typeof window === "undefined" || !window.navigator?.permissions?.query) {
      return;
    }

    let mounted = true;
    let permissionStatus;

    window.navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (!mounted) {
          return;
        }

        permissionStatus = status;
        setLocationPermission(status.state);
        permissionStatus.onchange = () => {
          setLocationPermission(permissionStatus.state);
        };
      })
      .catch(() => {});

    return () => {
      mounted = false;

      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ownerUid) {
      return;
    }

    return subscribeToQueueSettings(
      (settings) => {
        setQueueSettings(settings || {});
        setLocationMode(
          normalizeStoreLocationMode(settings?.locationMode)
        );
      },
      () => {}
    );
  }, [ownerUid]);

  useEffect(() => {
    locationPermissionRef.current = locationPermission;
  }, [locationPermission]);

  useEffect(() => {
    return () => {
      clearLocationRequestTimeout();
    };
  }, []);

  const activeStoreLocation = getStoreLocation(locationMode, queueSettings);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const hasLocationAccess = locationPermission === "granted";

  function clearLocationRequestTimeout() {
    if (locationRequestTimeoutRef.current) {
      window.clearTimeout(locationRequestTimeoutRef.current);
      locationRequestTimeoutRef.current = null;
    }
  }

  async function handleRequestLocationAccess() {
    setError("");
    setLocationAccessNotice("");
    setIsCheckingLocation(true);
    clearLocationRequestTimeout();

    locationRequestTimeoutRef.current = window.setTimeout(() => {
      if (locationPermissionRef.current === "granted") {
        return;
      }

      setLocationAccessNotice(
        "We still haven’t received a browser location prompt after 30 seconds. Location access is likely turned off in the browser/site settings or in your phone’s location settings. Please enable location access, then try again."
      );
      setIsCheckingLocation(false);
    }, LOCATION_PROMPT_TIMEOUT_MS);

    try {
      await getCurrentPosition();
      setLocationPermission("granted");
      setLocationAccessNotice("");
    } catch (locationError) {
      if (locationError?.code === 1) {
        setLocationPermission("denied");
      }

      setLocationAccessNotice("");
      setError(getGeolocationErrorMessage(locationError));
    } finally {
      clearLocationRequestTimeout();
      setIsCheckingLocation(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedName = form.name.trim();
    const trimmedPhone = normalizePhoneNumber(form.phone.trim());
    const isEmptySubmission = !trimmedName && !trimmedPhone;

    if (isEmptySubmission) {
      emptySubmitCountRef.current += 1;

      if (emptySubmitCountRef.current >= 4) {
        setForm({
          name: "Test Guest",
          phone: "8281851282",
          partySize: 2,
        });
        emptySubmitCountRef.current = 0;
      }

      return;
    }

    emptySubmitCountRef.current = 0;

    if (trimmedName.length < 2) {
      setError("Please enter the guest name.");
      return;
    }

    if (!PHONE_PATTERN.test(trimmedPhone)) {
      setError("Please enter a 10-digit phone number.");
      return;
    }

    if (!ownerUid) {
      setError("Your session is still loading. Try again in a moment.");
      return;
    }

    if (!hasLocationAccess) {
      setError("Please allow location access in the browser before joining the queue.");
      return;
    }

    setIsSubmitting(true);
    setIsCheckingLocation(true);

    let verifiedLocation;

    try {
      const position = await getCurrentPosition();
      const proximity = buildQueueJoinLocation(position.coords, activeStoreLocation);

      if (!proximity.withinRadius) {
        setError(
          `Queue check-in is only available within ${formatDistanceMeters(
            activeStoreLocation.radiusMeters
          )} of ${activeStoreLocation.name}. You are about ${formatDistanceMeters(
            proximity.distanceMeters
          )} away.`
        );
        setIsSubmitting(false);
        return;
      }

      verifiedLocation = proximity.location;
    } catch (locationError) {
      if (locationError?.code === 1) {
        setLocationPermission("denied");
      }

      setError(getGeolocationErrorMessage(locationError));
      setIsSubmitting(false);
      return;
    } finally {
      setIsCheckingLocation(false);
    }

    try {
      const entry = await createQueueEntry({
        name: trimmedName,
        phone: trimmedPhone,
        partySize: Number(form.partySize),
        location: verifiedLocation,
      });

      navigate(`/status?id=${entry.id}&date=${entry.queueDate}`, {
        replace: true,
        state: { justJoined: true },
      });
    } catch (submitError) {
      if (submitError?.code === "permission-denied") {
        setError(
        `We could not verify your public queue check-in yet. Make sure location access is allowed and try again while you are within ${formatDistanceMeters(
          activeStoreLocation.radiusMeters
        )} of the restaurant.`
        );
      } else {
        setError(
          getFriendlyError(
            submitError,
            "We could not save your queue request. Try again."
          )
        );
      }
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
            Join the table queue in under a minute.
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
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-900">Step 1 of 2: allow location access</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/75">
                Tap the browser prompt below so we can verify you are within {formatDistanceMeters(
                  activeStoreLocation.radiusMeters
                )} of {activeStoreLocation.name}. This is required before joining the queue.
              </p>
              <button
                type="button"
                className="mt-4 rounded-full border border-stone-900/10 bg-white/90 px-4 py-2 text-sm font-semibold text-clove transition hover:border-ember/40 hover:text-ember disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleRequestLocationAccess}
                disabled={isCheckingLocation}
              >
                {isCheckingLocation
                  ? "Checking location..."
                  : hasLocationAccess
                    ? "Location access granted"
                    : "Allow location access"}
              </button>
              {!hasLocationAccess && locationPermission === "denied" ? (
                <p className="mt-3 text-sm font-semibold text-rose-700">
                  If the browser does not show a prompt, location access is already
                  blocked for this site. Re-enable it from the browser’s site settings,
                  then tap the button again.
                </p>
              ) : null}
              {locationAccessNotice ? (
                <p className="mt-3 text-sm font-semibold text-amber-800">
                  {locationAccessNotice}
                </p>
              ) : null}
            </div>

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
                placeholder="8281851282"
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

            <button
              type="submit"
              className="warm-button w-full py-4 text-base"
              disabled={isSubmitting || !hasLocationAccess}
            >
              {isSubmitting
                ? isCheckingLocation
                  ? "Checking your location..."
                  : "Adding your party..."
                : locationPermission === "denied"
                  ? "Enable location to join"
                : "Join the queue"}
            </button>
          </form>
        </section>
      </div>

      <CustomerCredits />
    </main>
  );
}

export default JoinPage;
