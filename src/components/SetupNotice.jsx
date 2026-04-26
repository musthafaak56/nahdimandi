import { missingFirebaseConfig } from "../lib/firebase";

function SetupNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="glass-panel w-full max-w-3xl p-8 sm:p-12">
        <p className="font-body text-sm font-semibold uppercase tracking-[0.28em] text-clove/80">
          Database setup needed
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl text-ink sm:text-5xl">
          Add your database config before starting the queue app.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink/75">
          Copy <code>.env.example</code> to <code>.env</code>, fill in the
          required database project values, then start the dev server.
        </p>

        <div className="mt-8 rounded-[1.75rem] border border-stone-900/10 bg-stone-950 p-6 text-sm text-stone-100">
          <p className="font-semibold text-stone-50">Missing variables</p>
          <ul className="mt-4 space-y-2">
            {missingFirebaseConfig.map((item) => (
              <li key={item} className="rounded-xl border border-white/10 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

export default SetupNotice;
