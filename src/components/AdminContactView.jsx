import { startTransition, useEffect, useState } from "react";
import { useAuthState } from "./AuthProvider";
import { formatClock } from "../lib/time";
import {
  createSupportTicket,
  getSupportTicketErrorMessage,
  SUPER_ADMIN_EMAIL,
  subscribeToSupportTickets,
  updateSupportTicketStatus,
} from "../lib/support";

const CONTACT_PHONE = "+918281851272";
const PORTFOLIO_URL = "https://musthafa-portfolio.web.app";

function AdminContactView() {
  const { user } = useAuthState();
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [busyTicketId, setBusyTicketId] = useState("");
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    message: "",
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      setIsLoadingTickets(false);
      setTickets([]);
      return undefined;
    }

    setIsLoadingTickets(true);
    const unsubscribe = subscribeToSupportTickets(
      (nextTickets) => {
        startTransition(() => {
          setTickets(nextTickets);
          setIsLoadingTickets(false);
        });
      },
      (ticketError) => {
        setError(getSupportTicketErrorMessage(ticketError, "Could not load the support tickets."));
        setIsLoadingTickets(false);
      }
    );

    return unsubscribe;
  }, [isSuperAdmin]);

  function updateField(field, value) {
    setTicketForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSending(true);

    try {
      await createSupportTicket({
        subject: ticketForm.subject,
        message: ticketForm.message,
        contactPhone: CONTACT_PHONE,
        portfolioUrl: PORTFOLIO_URL,
      });

      setTicketForm({
        subject: "",
        message: "",
      });
      setSuccessMessage("Ticket sent.");
    } catch (ticketError) {
      setError(getSupportTicketErrorMessage(ticketError, "Could not send the support ticket."));
    } finally {
      setIsSending(false);
    }
  }

  async function handleToggleStatus(ticketId, nextStatus) {
    setBusyTicketId(ticketId);
    setError("");

    try {
      await updateSupportTicketStatus(ticketId, nextStatus);
    } catch (statusError) {
      setError(getSupportTicketErrorMessage(statusError, "Could not update this support ticket."));
    } finally {
      setBusyTicketId("");
    }
  }

  return (
    <div className="space-y-6 animate-fadeSlide">
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="admin-panel p-5 sm:p-6">
          <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-cyan">
            Admin Contact
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-admin-line/40 bg-admin-base/55 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-mute">
                Owner phone
              </p>
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="mt-2 block font-admin text-xl font-bold text-admin-text transition hover:text-admin-cyan"
              >
                {CONTACT_PHONE}
              </a>
            </div>
            <div className="rounded-2xl border border-admin-line/40 bg-admin-base/55 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-mute">
                Portfolio link
              </p>
              <a
                href={PORTFOLIO_URL}
                className="mt-2 block break-all font-admin text-lg font-bold text-admin-text transition hover:text-admin-cyan"
                target="_blank"
                rel="noreferrer"
              >
                {PORTFOLIO_URL}
              </a>
            </div>
          </div>
        </div>

        <form className="admin-panel p-5 sm:p-6" onSubmit={handleSubmit}>
          <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-cyan">
            Send ticket
          </p>
          <h2 className="mt-3 font-admin text-2xl font-bold text-admin-text">
            Raise an internal ticket
          </h2>
          <p className="mt-4 text-sm leading-7 text-admin-mute">
            This ticket will include your admin account details and the shared
            contact info automatically.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-admin-mute">
                Ticket subject
              </span>
              <input
                className="w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3 text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10"
                type="text"
                value={ticketForm.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="Queue issue, update request, or reminder"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-admin-mute">
                Ticket details
              </span>
              <textarea
                className="min-h-40 w-full rounded-2xl border border-admin-line bg-admin-base/70 px-4 py-3 text-base text-admin-text outline-none transition focus:border-admin-cyan/50 focus:ring-4 focus:ring-admin-cyan/10"
                value={ticketForm.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Write the internal note for the super-admin..."
              />
            </label>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-admin-rose/25 bg-admin-rose/10 px-4 py-3 text-sm text-admin-rose">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-5 rounded-2xl border border-admin-mint/20 bg-admin-mint/10 px-4 py-3 text-sm text-admin-mint">
              {successMessage}
            </div>
          ) : null}

          <button
            type="submit"
            className="admin-button mt-6 w-full bg-admin-cyan text-admin-base hover:bg-[#76d4f0] focus:ring-admin-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSending}
          >
            {isSending ? "Sending ticket..." : "Send internal ticket"}
          </button>
        </form>
      </section>

      {isSuperAdmin ? (
        <section className="admin-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-admin text-sm font-semibold uppercase tracking-[0.28em] text-admin-cyan">
                Super-admin inbox
              </p>
              <h2 className="mt-3 font-admin text-2xl font-bold text-admin-text">
                Internal tickets waiting for review
              </h2>
            </div>
          </div>

          {isLoadingTickets ? (
            <div className="mt-5 rounded-2xl border border-admin-line/40 bg-admin-base/55 p-4 text-sm text-admin-mute">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-admin-line/40 bg-admin-base/55 p-4 text-sm text-admin-mute">
              No internal tickets yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {tickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-[1.5rem] border border-admin-line/50 bg-admin-base/55 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-admin-mute">
                        {ticket.status || "open"}
                      </p>
                      <h3 className="mt-2 font-admin text-xl font-bold text-admin-text">
                        {ticket.subject}
                      </h3>
                      <p className="mt-2 text-sm text-admin-mute">
                        From {ticket.fromEmail || "admin"} · {formatClock(ticket.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="admin-button bg-admin-cyan/15 px-4 py-2 text-xs text-admin-cyan ring-1 ring-admin-cyan/30 hover:bg-admin-cyan/22 focus:ring-admin-cyan/20"
                        onClick={() =>
                          handleToggleStatus(
                            ticket.id,
                            ticket.status === "resolved" ? "open" : "resolved"
                          )
                        }
                        disabled={Boolean(busyTicketId)}
                      >
                        {busyTicketId === ticket.id
                          ? "Updating..."
                          : ticket.status === "resolved"
                            ? "Reopen"
                            : "Mark resolved"}
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-admin-text">
                    {ticket.message}
                  </p>

                  <div className="mt-4 grid gap-3 rounded-2xl border border-admin-line/40 bg-admin-base/70 p-4 text-sm text-admin-mute sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-admin-mute">
                        Owner phone
                      </p>
                      <p className="mt-1 font-medium text-admin-text">{ticket.contactPhone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-admin-mute">
                        Portfolio link
                      </p>
                      <a
                        href={ticket.portfolioUrl}
                        className="mt-1 block break-all font-medium text-admin-text transition hover:text-admin-cyan"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {ticket.portfolioUrl}
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default AdminContactView;
