const STATUS_STYLES = {
  waiting: "bg-brass/15 text-clove ring-1 ring-brass/35",
  notified: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/35",
  seated: "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/35",
  cancelled: "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/35",
};

function StatusBadge({ status }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        STATUS_STYLES[status] || "bg-stone-900/10 text-stone-700"
      }`}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
