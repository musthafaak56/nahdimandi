import StatusBadge from "./StatusBadge";
import { formatClock, formatJoinedLabel } from "../lib/time";

function QueueCard({ entry, position, busyAction, onAction }) {
  return (
    <article className="admin-panel animate-fadeSlide overflow-hidden p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-admin-cyan/10 px-3 py-1 font-admin text-xs font-semibold uppercase tracking-[0.22em] text-admin-cyan">
              Queue #{position}
            </span>
            <StatusBadge status={entry.status} />
          </div>
          <h2 className="mt-4 font-admin text-2xl font-bold text-admin-text">
            {entry.name}
          </h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-admin-mute">
            <span>{entry.phone}</span>
            <span>{entry.partySize} guests</span>
            <span>{formatJoinedLabel(entry.timestamp)}</span>
            <span>Joined at {formatClock(entry.timestamp)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 md:max-w-sm md:justify-end">
          <button
            type="button"
            className="admin-button bg-admin-mint/15 text-admin-mint ring-1 ring-admin-mint/30 hover:bg-admin-mint/22 focus:ring-admin-mint/30"
            onClick={() => onAction(entry.id, "notified")}
            disabled={busyAction || entry.status === "notified"}
          >
            {entry.status === "notified" ? "Table ready sent" : "Table Ready"}
          </button>
          <button
            type="button"
            className="admin-button bg-admin-cyan/15 text-admin-cyan ring-1 ring-admin-cyan/30 hover:bg-admin-cyan/22 focus:ring-admin-cyan/30"
            onClick={() => onAction(entry.id, "seated")}
            disabled={busyAction}
          >
            Seated
          </button>
          <button
            type="button"
            className="admin-button bg-admin-rose/15 text-admin-rose ring-1 ring-admin-rose/30 hover:bg-admin-rose/22 focus:ring-admin-rose/30"
            onClick={() => onAction(entry.id, "cancelled")}
            disabled={busyAction}
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

export default QueueCard;
