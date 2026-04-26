import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, db, firebaseConfig, vapidKey } from "./firebase";

function buildMessagingWorkerUrl() {
  const url = new URL("/firebase-messaging-sw.js", window.location.origin);

  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export async function canUsePushNotifications() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator) || !vapidKey) {
    return false;
  }

  return isSupported().catch(() => false);
}

export async function requestQueueNotifications(queueId) {
  const supported = await canUsePushNotifications();

  if (!supported) {
    return { status: "unsupported" };
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    return { status: "denied" };
  }

  const registration = await navigator.serviceWorker.register(
    buildMessagingWorkerUrl(),
    { scope: "/" }
  );

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    return { status: "missing-token" };
  }

  await updateDoc(doc(db, "queue", queueId), {
    fcmToken: token,
    fcmTokenUpdatedAt: serverTimestamp(),
  });

  return { status: "granted", token };
}

export async function subscribeToForegroundMessages(onReceive) {
  const supported = await canUsePushNotifications();

  if (!supported) {
    return () => {};
  }

  const messaging = getMessaging(app);
  return onMessage(messaging, onReceive);
}
