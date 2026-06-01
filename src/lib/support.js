import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { auth, db, isPasswordUser, waitForInitialAuth } from "./firebase";
import {
  createE2ESupportTicket,
  isE2EMode,
  subscribeToE2ESupportTickets,
  updateE2ESupportTicketStatus,
} from "./e2eRuntime";

export const SUPER_ADMIN_EMAIL = "musthafaak56@gmail.com";
export const SUPPORT_TICKETS_COLLECTION = "support_tickets";

export function getSupportTicketErrorMessage(error, fallback = "Something went wrong with support tickets.") {
  if (!error) {
    return fallback;
  }

  if (error.code === "permission-denied") {
    return "Support tickets are not accessible yet. Please deploy the Firestore rules or check the super-admin login.";
  }

  if (error.code === "not-found") {
    return "That support ticket no longer exists.";
  }

  return (
    (typeof error.message === "string" && error.message.trim()) ||
    fallback
  );
}

function mapDocs(snapshot) {
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function createSupportTicket({
  subject,
  message,
  contactPhone,
  portfolioUrl,
  ticketToEmail = SUPER_ADMIN_EMAIL,
}) {
  if (isE2EMode()) {
    return createE2ESupportTicket({
      subject,
      message,
      contactPhone,
      portfolioUrl,
      ticketToEmail,
    });
  }

  const user = auth?.currentUser ?? (await waitForInitialAuth());

  if (!user) {
    throw new Error("You must be signed in before sending a support ticket.");
  }

  if (!isPasswordUser(user)) {
    throw new Error("Only admin users can send support tickets.");
  }

  const ticketSubject = String(subject || "").trim();
  const ticketMessage = String(message || "").trim();

  if (ticketSubject.length < 3) {
    throw new Error("Enter a subject before sending the ticket.");
  }

  if (ticketMessage.length < 10) {
    throw new Error("Enter a longer message before sending the ticket.");
  }

  const ticketRef = await addDoc(collection(db, SUPPORT_TICKETS_COLLECTION), {
    subject: ticketSubject,
    message: ticketMessage,
    contactPhone: String(contactPhone || "").trim(),
    portfolioUrl: String(portfolioUrl || "").trim(),
    ticketToEmail,
    fromUid: user.uid,
    fromEmail: user.email || "",
    fromDisplayName: user.displayName || "",
    status: "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ticketRef.id;
}

export function subscribeToSupportTickets(onNext, onError) {
  if (isE2EMode()) {
    return subscribeToE2ESupportTickets(onNext, onError);
  }

  const supportTicketsQuery = query(
    collection(db, SUPPORT_TICKETS_COLLECTION),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    supportTicketsQuery,
    (snapshot) => onNext(mapDocs(snapshot)),
    onError
  );
}

export async function updateSupportTicketStatus(ticketId, status) {
  if (isE2EMode()) {
    return updateE2ESupportTicketStatus(ticketId, status);
  }

  await updateDoc(doc(db, SUPPORT_TICKETS_COLLECTION, ticketId), {
    status,
    updatedAt: serverTimestamp(),
    resolvedAt: status === "resolved" ? serverTimestamp() : null,
  });
}
