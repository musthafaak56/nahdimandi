import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useAuthState } from "./AuthProvider";
import { getFriendlyError } from "../lib/errors";
import {
  deleteQueueEntryPermanently,
  getAllQueueHistory,
  getQueueHistoryPageByDate,
} from "../lib/queue";
import { formatDistanceMeters } from "../lib/geofence";
import {
  formatClock,
  formatRestaurantDateLabel,
  getRestaurantDateKey,
  getRestaurantHour,
  getRestaurantWeekdayIndex,
} from "../lib/time";

const SUPER_ADMIN_EMAIL = "musthafaak56@gmail.com";
const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HISTORY_PAGE_SIZE = 10;

function formatHourLabel(hour) {
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}${hour < 12 ? "a" : "p"}`;
}

function getPeakDatum(series) {
  if (!series.length || series.every((item) => item.value === 0)) {
    return { label: "--", value: 0 };
  }

  return series.reduce(
    (peak, item) => (item.value > peak.value ? item : peak),
    series[0] || { label: "--", value: 0 }
  );
}

function AnalyticsCard({ title, subtitle, peakLabel, peakValue, accentClassName, data }) {
  const maxValue = Math.max(...data.map((item) => item.value), 0) || 1;

  return (
    <article className="rounded-[1.75rem] border border-admin-line/50 bg-admin-base/45 p-5 shadow-[0_12px_40px_rgba(4,10,20,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-admin text-xs font-semibold uppercase tracking-[0.28em] text-admin-mute">
            {title}
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-admin-mute">
            {subtitle}
          </p>
        </div>

        {peakLabel ? (
          <div className="rounded-2xl border border-admin-line/40 bg-admin-base/65 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-mute">
              Peak
            </p>
            <p className="mt-1 font-admin text-base font-bold text-admin-text">
              {peakLabel}
            </p>
            <p className={`mt-1 text-xs font-semibold ${accentClassName}`}>
              {peakValue} entries
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div
          className="grid min-w-[32rem] items-end gap-2"
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
        >
          {data.map((item) => {
            const barHeight = Math.max((item.value / maxValue) * 100, item.value > 0 ? 6 : 0);

            return (
              <div key={`${title}-${item.label}`} className="flex h-56 flex-col justify-end gap-2">
                <div className="flex flex-1 items-end">
                  <div
                    className={`w-full rounded-t-2xl bg-gradient-to-t ${item.barClassName}`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-[11px] font-semibold text-admin-text">{item.value}</p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-admin-mute">
                    {item.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function buildAnalytics(entries) {
  const hourlySeries = Array.from({ length: 24 }, (_, hour) => ({
    label: formatHourLabel(hour),
    value: 0,
    barClassName: "from-admin-cyan/20 via-admin-cyan/65 to-admin-cyan",
  }));

  const weekdaySeries = WEEKDAY_ORDER.map((weekday) => ({
    label: weekday,
    value: 0,
    barClassName: "from-admin-mint/20 via-admin-mint/65 to-admin-mint",
  }));

  const dateCounts = new Map();
  let totalSeated = 0;
  let totalCancelled = 0;
  let totalGuests = 0;

  entries.forEach((entry) => {
    const hour = getRestaurantHour(entry.timestamp);
    if (hour !== null && hourlySeries[hour]) {
      hourlySeries[hour].value += 1;
    }

    const weekdayIndex = getRestaurantWeekdayIndex(entry.timestamp);
    if (weekdayIndex !== null && weekdaySeries[weekdayIndex]) {
      weekdaySeries[weekdayIndex].value += 1;
    }

    const dateKey = entry.queueDate;
    if (dateKey) {
      dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);
    }

    if (entry.status === "seated") {
      totalSeated += 1;
    }

    if (entry.status === "cancelled") {
      totalCancelled += 1;
    }

    totalGuests += Number(entry.partySize || 0);
  });

  const peakHour = getPeakDatum(hourlySeries);
  const peakDay = getPeakDatum(weekdaySeries);
  const peakDates = Array.from(dateCounts.entries())
    .map(([dateKey, value]) => ({
      dateKey,
      label: formatRestaurantDateLabel(dateKey),
      value,
      barClassName: "from-amber-500/20 via-amber-500/70 to-amber-500",
    }))
    .sort((a, b) => b.value - a.value || a.dateKey.localeCompare(b.dateKey))
    .slice(0, 7);
  const peakDate = getPeakDatum(peakDates);
  const totalJoined = entries.length;
  const averagePartySize = totalJoined ? totalGuests / totalJoined : 0;

  return {
    totalJoined,
    totalSeated,
    totalCancelled,
    totalGuests,
    averagePartySize,
    hourlySeries,
    weekdaySeries,
    peakHour,
    peakDay,
    peakDates,
    peakDate,
  };
}

function AdminHistoryView() {
  const { user } = useAuthState();
  const [date, setDate] = useState(() => getRestaurantDateKey());
  const [history, setHistory] = useState([]);
  const [analyticsHistory, setAnalyticsHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasNextHistoryPage, setHasNextHistoryPage] = useState(false);
  const [hasPreviousHistoryPage, setHasPreviousHistoryPage] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [error, setError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState("");
  const [historyRangeLabel, setHistoryRangeLabel] = useState("0-0");
  const historyCursorRef = useRef({ firstDoc: null, lastDoc: null });
  const historyRequestRef = useRef(0);
  const historyPageRef = useRef(1);

  async function loadHistoryPage(pageMode = "initial") {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    const currentPage = historyPageRef.current;

    setIsHistoryLoading(true);
    setError("");

    try {
      const result = await getQueueHistoryPageByDate(date, {
        pageSize: HISTORY_PAGE_SIZE,
        startAfterDoc: pageMode === "next" ? historyCursorRef.current.lastDoc : null,
        endBeforeDoc: pageMode === "previous" ? historyCursorRef.current.firstDoc : null,
      });

      if (historyRequestRef.current !== requestId) {
        return;
      }

      historyCursorRef.current = {
        firstDoc: result.firstDoc,
        lastDoc: result.lastDoc,
      };

      const nextPage =
        pageMode === "next"
          ? currentPage + 1
          : pageMode === "previous"
            ? Math.max(1, currentPage - 1)
            : 1;
      historyPageRef.current = nextPage;

      startTransition(() => {
        setHistory(result.entries);
        setHasNextHistoryPage(result.hasNextPage);
        setHasPreviousHistoryPage(result.hasPreviousPage);
        setHistoryPage(nextPage);
        const startIndex = result.entries.length ? (nextPage - 1) * HISTORY_PAGE_SIZE + 1 : 0;
        const endIndex = startIndex + result.entries.length - 1;
        setHistoryRangeLabel(
          result.entries.length ? `${startIndex}-${endIndex}` : "0-0"
        );
        setIsHistoryLoading(false);
      });
    } catch (err) {
      if (historyRequestRef.current !== requestId) {
        return;
      }

      setError(getFriendlyError(err, "Could not load history for this date."));
      setIsHistoryLoading(false);
    }
  }

  useEffect(() => {
    historyCursorRef.current = { firstDoc: null, lastDoc: null };
    historyPageRef.current = 1;
    setHistoryPage(1);
    setHasNextHistoryPage(false);
    setHasPreviousHistoryPage(false);
    setHistoryRangeLabel("0-0");
    loadHistoryPage("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    let isActive = true;
    setIsAnalyticsLoading(true);
    setAnalyticsError("");

    getAllQueueHistory()
      .then((entries) => {
        if (isActive) {
          startTransition(() => {
            setAnalyticsHistory(entries);
            setIsAnalyticsLoading(false);
          });
        }
      })
      .catch((err) => {
        if (isActive) {
          setAnalyticsError(
            err?.code === "permission-denied"
              ? "All-time analytics need an admin Firestore read. Refresh after the rules update."
              : getFriendlyError(err, "Could not load all-time analytics.")
          );
          setIsAnalyticsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleNextHistoryPage() {
    if (isHistoryLoading || !hasNextHistoryPage) {
      return;
    }

    await loadHistoryPage("next");
  }

  async function handlePreviousHistoryPage() {
    if (isHistoryLoading || !hasPreviousHistoryPage) {
      return;
    }

    await loadHistoryPage("previous");
  }

  const selectedTotalJoined = history.length;
  const selectedSeatedEntries = history.filter((e) => e.status === "seated");
  const selectedTotalSeated = selectedSeatedEntries.length;
  const selectedTotalCancelled = history.filter((e) => e.status === "cancelled").length;
  const selectedTotalGuests = selectedSeatedEntries.reduce(
    (total, e) => total + (Number(e.partySize) || 0),
    0
  );

  const selectedHourCounts = {};
  history.forEach((entry) => {
    const hour = getRestaurantHour(entry.timestamp);
    if (hour !== null) {
      selectedHourCounts[hour] = (selectedHourCounts[hour] || 0) + 1;
    }
  });

  let selectedPeakHour = "--";
  if (Object.keys(selectedHourCounts).length > 0) {
    const maxHour = Object.keys(selectedHourCounts).reduce((a, b) =>
      selectedHourCounts[a] > selectedHourCounts[b] ? a : b
    );
    selectedPeakHour = formatHourLabel(parseInt(maxHour, 10));
  }

  const analytics = useMemo(
    () => buildAnalytics(analyticsHistory),
    [analyticsHistory]
  );

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  function buildLocationCell(location, storeName, fallback) {
    if (!location) {
      return <span className="text-admin-mute/70">{fallback}</span>;
    }

    return (
      <span
        className={
          location.withinRadius
            ? "font-semibold text-admin-mint"
            : "font-semibold text-amber-500"
        }
      >
        {formatDistanceMeters(location.distanceMeters)} from {storeName || "the store"} (
        {location.withinRadius ? "inside" : "outside"} the arrival zone)
      </span>
    );
  }

  async function handleDelete(entry) {
    const queueId = entry.queueId || entry.id;

    if (!window.confirm(`Delete ${entry.name}'s history entry permanently?`)) {
      return;
    }

    setDeletingEntryId(queueId);
    setError("");

    try {
      await deleteQueueEntryPermanently(entry);
      setHistory((current) =>
        current.filter((item) => (item.queueId || item.id) !== queueId)
      );
      setAnalyticsHistory((current) =>
        current.filter((item) => (item.queueId || item.id) !== queueId)
      );
    } catch (deleteError) {
      setError(
        getFriendlyError(deleteError, "Could not delete this history entry.")
      );
    } finally {
      setDeletingEntryId("");
    }
  }

  return (
    <div className="space-y-6 animate-fadeSlide">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-cyan">
            History & Analytics
          </p>
          <h2 className="mt-2 font-admin text-2xl font-bold text-admin-text">
            Track daily history and all-time queue patterns.
          </h2>
        </div>
        <input
          type="date"
          className="rounded-lg border border-admin-line/50 bg-admin-base/80 px-4 py-2 font-admin text-admin-text outline-none focus:border-admin-cyan"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-[1.5rem] border border-admin-rose/25 bg-admin-rose/10 px-5 py-4 text-sm text-admin-rose">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-mute">
              Selected date snapshot
            </p>
            <p className="mt-2 text-sm leading-6 text-admin-mute">
              {date} in restaurant time.
            </p>
          </div>
          <div className="rounded-2xl border border-admin-line/40 bg-admin-base/60 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-mute">
              Selected peak hour
            </p>
            <p className="mt-1 font-admin text-base font-bold text-admin-text">
              {isHistoryLoading ? "--" : selectedPeakHour}
            </p>
            <p className="mt-1 text-xs font-semibold text-admin-cyan">
              {isHistoryLoading ? "--" : `${selectedTotalJoined} joins`}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
              Total Joined
            </p>
            <p className="mt-2 font-admin text-3xl font-bold text-admin-text">
              {isHistoryLoading ? "--" : selectedTotalJoined}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
              Parties Seated
            </p>
            <p className="mt-2 font-admin text-3xl font-bold text-admin-cyan">
              {isHistoryLoading ? "--" : selectedTotalSeated}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
              Guests Seated
            </p>
            <p className="mt-2 font-admin text-3xl font-bold text-emerald-500">
              {isHistoryLoading ? "--" : selectedTotalGuests}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
              Cancelled
            </p>
            <p className="mt-2 font-admin text-3xl font-bold text-amber-500">
              {isHistoryLoading ? "--" : selectedTotalCancelled}
            </p>
          </div>
        </div>
      </section>

      <div className="rounded-[2rem] border border-admin-line/50 bg-admin-base/30 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-line/20 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
              Queue history
            </p>
            <p className="mt-1 text-sm text-admin-mute">
              {isHistoryLoading
                ? "Loading page..."
                : `Page ${historyPage} · Showing entries ${historyRangeLabel} for ${date}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="admin-button bg-white/10 px-4 py-2 text-xs text-admin-text ring-1 ring-white/15 hover:bg-white/16 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handlePreviousHistoryPage}
              disabled={isHistoryLoading || !hasPreviousHistoryPage}
            >
              Previous
            </button>
            <button
              type="button"
              className="admin-button bg-admin-cyan/15 px-4 py-2 text-xs text-admin-cyan ring-1 ring-admin-cyan/30 hover:bg-admin-cyan/22 focus:ring-admin-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleNextHistoryPage}
              disabled={isHistoryLoading || !hasNextHistoryPage}
            >
              Next
            </button>
          </div>
        </div>

        {isHistoryLoading ? (
          <div className="p-10 text-center text-admin-mute">Loading day history...</div>
        ) : history.length === 0 ? (
          <div className="p-10 text-center text-admin-mute">No entries for this date.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-admin-mute">
              <thead className="bg-admin-line/20 text-admin-text">
                <tr>
                  <th className="px-6 py-4 font-semibold">Time</th>
                  <th className="px-6 py-4 font-semibold">Guest</th>
                  <th className="px-6 py-4 font-semibold">Party</th>
                  <th className="px-6 py-4 font-semibold">Join Location</th>
                  <th className="px-6 py-4 font-semibold">Table Ready Location</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  {isSuperAdmin ? (
                    <th className="px-6 py-4 font-semibold text-right">Delete</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line/20">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-admin-line/10">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatClock(entry.timestamp)}
                    </td>
                    <td className="px-6 py-4 font-medium text-admin-text">
                      {entry.name}
                    </td>
                    <td className="px-6 py-4">{entry.partySize}</td>
                    <td className="px-6 py-4">
                      {entry.joinSource === "admin"
                        ? "Added by admin at the desk"
                        : buildLocationCell(
                            entry.location,
                            entry.storeName,
                            "No join location"
                          )}
                    </td>
                    <td className="px-6 py-4">
                      {entry.tableReadyLocation
                        ? buildLocationCell(
                            entry.tableReadyLocation,
                            entry.storeName,
                            "No table-ready location"
                          )
                        : entry.status === "notified"
                          ? "Awaiting live location check"
                          : "Not checked yet"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                          entry.status === "seated"
                            ? "bg-admin-cyan/15 text-admin-cyan"
                            : entry.status === "cancelled"
                              ? "bg-admin-rose/15 text-admin-rose"
                              : "bg-admin-mint/15 text-admin-mint"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    {isSuperAdmin ? (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="admin-button bg-admin-rose/15 px-3 py-2 text-xs text-admin-rose ring-1 ring-admin-rose/30 hover:bg-admin-rose/22 focus:ring-admin-rose/20"
                          onClick={() => handleDelete(entry)}
                          disabled={deletingEntryId === (entry.queueId || entry.id)}
                        >
                          {deletingEntryId === (entry.queueId || entry.id)
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-cyan">
              All-time analytics
            </p>
            <h3 className="mt-2 font-admin text-2xl font-bold text-admin-text">
              Peak hours, peak days, and the busiest dates.
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-admin-mute">
              These charts scan every queue entry across all dates so you can spot
              weekly trends and the calendar days that bring the most traffic.
            </p>
          </div>
          <div className="rounded-2xl border border-admin-line/40 bg-admin-base/60 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-mute">
              All-time total
            </p>
            <p className="mt-1 font-admin text-base font-bold text-admin-text">
              {isAnalyticsLoading ? "--" : analytics.totalJoined}
            </p>
            <p className="mt-1 text-xs font-semibold text-admin-cyan">
              {isAnalyticsLoading ? "--" : `${Math.round(analytics.averagePartySize * 10) / 10} avg party`}
            </p>
          </div>
        </div>

        {analyticsError ? (
          <div className="rounded-[1.5rem] border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-700">
            {analyticsError}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
              All-time joined
            </p>
            <p className="mt-2 font-admin text-3xl font-bold text-admin-text">
              {isAnalyticsLoading ? "--" : analytics.totalJoined}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
              All-time seated
            </p>
            <p className="mt-2 font-admin text-3xl font-bold text-admin-cyan">
              {isAnalyticsLoading ? "--" : analytics.totalSeated}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
              All-time cancelled
            </p>
            <p className="mt-2 font-admin text-3xl font-bold text-admin-rose">
              {isAnalyticsLoading ? "--" : analytics.totalCancelled}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
              Average party size
            </p>
            <p className="mt-2 font-admin text-3xl font-bold text-emerald-500">
              {isAnalyticsLoading ? "--" : Math.round(analytics.averagePartySize * 10) / 10}
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <AnalyticsCard
            title="Peak hour"
            subtitle="How queue joins are distributed across the day."
            peakLabel={isAnalyticsLoading ? "--" : analytics.peakHour.label}
            peakValue={isAnalyticsLoading ? 0 : analytics.peakHour.value}
            accentClassName="text-admin-cyan"
            data={isAnalyticsLoading ? [] : analytics.hourlySeries}
          />
          <AnalyticsCard
            title="Peak days"
            subtitle="Which weekdays receive the most queue traffic."
            peakLabel={isAnalyticsLoading ? "--" : analytics.peakDay.label}
            peakValue={isAnalyticsLoading ? 0 : analytics.peakDay.value}
            accentClassName="text-admin-mint"
            data={isAnalyticsLoading ? [] : analytics.weekdaySeries}
          />
          <AnalyticsCard
            title="Peak dates"
            subtitle="The busiest calendar dates across the full history."
            peakLabel={isAnalyticsLoading ? "--" : analytics.peakDate.label}
            peakValue={isAnalyticsLoading ? 0 : analytics.peakDate.value}
            accentClassName="text-amber-500"
            data={isAnalyticsLoading ? [] : analytics.peakDates}
          />
        </div>
      </section>
    </div>
  );
}

export default AdminHistoryView;
