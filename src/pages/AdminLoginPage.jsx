import { useState } from "react";
import { Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuthState } from "../components/AuthProvider";
import { auth } from "../lib/firebase";
import { getFriendlyError } from "../lib/errors";

function AdminLoginPage() {
  const { isAdmin, loading } = useAuthState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!loading && isAdmin) {
    return <Navigate replace to="/admin" />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (loginError) {
      setError(
        getFriendlyError(
          loginError,
          "Admin sign-in failed. Check the credentials and try again."
        )
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-admin-base px-4 py-8 text-admin-text sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-admin-line/70 bg-[radial-gradient(circle_at_top_left,_rgba(82,199,234,0.18),_transparent_36%),linear-gradient(145deg,_rgba(16,24,32,1)_0%,_rgba(20,33,44,1)_52%,_rgba(12,18,27,1)_100%)] p-8 sm:p-10">
            <p className="font-admin text-sm font-semibold uppercase tracking-[0.3em] text-admin-cyan">
              Nahdi Mandi
            </p>
            <h1 className="mt-5 max-w-lg font-admin text-5xl font-bold tracking-tight">
              Front desk queue control, built for fast service.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-admin-mute">
              Sign in with an email/password Firebase admin account to manage the
              live queue, notify guests, and seat parties without refreshing.
            </p>
          </section>

          <section className="admin-panel p-6 sm:p-8">
            <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-mute">
              Admin login
            </p>
            <h2 className="mt-3 font-admin text-3xl font-bold text-admin-text">
              Sign in
            </h2>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-admin-mute">
                  Email
                </span>
                <input
                  className="w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3.5 text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-admin-mute">
                  Password
                </span>
                <input
                  className="w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3.5 text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-admin-rose/25 bg-admin-rose/10 px-4 py-3 text-sm text-admin-rose">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="admin-button w-full bg-admin-cyan text-admin-base hover:bg-[#76d4f0] focus:ring-admin-cyan/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Enter dashboard"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

export default AdminLoginPage;
