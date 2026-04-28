import { startTransition, useEffect, useState } from "react";
import { getFriendlyError } from "../lib/errors";
import { getQueueHistoryByDate } from "../lib/queue";
import { formatClock, getRestaurantDateKey, getRestaurantHour } from "../lib/time";

function AdminHistoryView() {
  const [date, setDate] = useState(() => getRestaurantDateKey());
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError("");

    getQueueHistoryByDate(date)
      .then((entries) => {
        if (isActive) {
          startTransition(() => {
            setHistory(entries);
            setIsLoading(false);
          });
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(getFriendlyError(err, "Could not load history for this date."));
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [date]);

  const totalJoined = history.length;
  const seatedEntries = history.filter((e) => e.status === "seated");
  const totalSeated = seatedEntries.length;
  const totalCancelled = history.filter((e) => e.status === "cancelled").length;
  const totalGuests = seatedEntries.reduce((total, e) => total + (Number(e.partySize) || 0), 0);

  // Peak hour
  const hourCounts = {};
  history.forEach((e) => {
    const hour = getRestaurantHour(e.timestamp);
    if (hour !== null) {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  let peakHour = "--";
  if (Object.keys(hourCounts).length > 0) {
    const maxHour = Object.keys(hourCounts).reduce((a, b) =>
      hourCounts[a] > hourCounts[b] ? a : b
    );
    // Format peak hour nicely, like 6 PM
    const hr = parseInt(maxHour, 10);
    const ampm = hr >= 12 ? "PM" : "AM";
    const formattedHr = hr % 12 || 12;
    peakHour = `${formattedHr} ${ampm}`;
  }

  return (
    <div className="space-y-6 animate-fadeSlide">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-admin text-2xl font-bold text-admin-text">
          History & Analytics
        </h2>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
            Total Joined
          </p>
          <p className="mt-2 font-admin text-3xl font-bold text-admin-text">
            {isLoading ? "--" : totalJoined}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
            Parties Seated
          </p>
          <p className="mt-2 font-admin text-3xl font-bold text-admin-cyan">
            {isLoading ? "--" : totalSeated}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
            Guests Seated
          </p>
          <p className="mt-2 font-admin text-3xl font-bold text-emerald-500">
            {isLoading ? "--" : totalGuests}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-mute">
            Peak Hour
          </p>
          <p className="mt-2 font-admin text-3xl font-bold text-amber-500">
            {isLoading ? "--" : peakHour}
          </p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-admin-line/50 bg-admin-base/30 overflow-hidden">
        {isLoading ? (
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
                  <th className="px-6 py-4 font-semibold">Status</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminHistoryView;
