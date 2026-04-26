function LoadingScreen({ label = "Loading queue..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-panel w-full max-w-sm p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ember/10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ember/25 border-t-ember" />
        </div>
        <p className="mt-5 font-body text-sm font-semibold uppercase tracking-[0.24em] text-clove/80">
          Nahdi Mandi
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink">{label}</h1>
      </div>
    </div>
  );
}

export default LoadingScreen;
