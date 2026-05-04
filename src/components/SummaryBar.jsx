function SummaryStat({ label, value, tone }) {
  return (
    <div className="rounded-[1.5rem] border border-admin-line/80 bg-admin-base/70 p-5">
      <p className="font-admin text-xs font-semibold uppercase tracking-[0.28em] text-admin-mute">
        {label}
      </p>
      <p className={`mt-3 font-admin text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function SummaryBar({ totalWaiting, totalPartySize, nextUp }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <SummaryStat
        label="Waiting parties"
        value={String(totalWaiting).padStart(2, "0")}
        tone="text-admin-text"
      />
      <SummaryStat
        label="Guests in queue"
        value={String(totalPartySize).padStart(2, "0")}
        tone="text-admin-cyan"
      />
      <div className="sm:col-span-2">
        <SummaryStat
          label="Next up"
          value={nextUp ? `${nextUp.name} · ${nextUp.partySize}` : "No queue"}
          tone="text-admin-amber"
        />
      </div>
    </section>
  );
}

export default SummaryBar;
