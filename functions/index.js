import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";

initializeApp();

const GOOGLE_REVIEW_URL = "https://maps.app.goo.gl/FVabh8HZ7tCmbmhb7?g_st=ic";
const adminDb = getFirestore();

function buildNotificationPayload(queueId, status) {
  if (status === "seated") {
    return {
      logLabel: "Review request push notification sent.",
      webpush: {
        headers: {
          Urgency: "normal",
        },
        notification: {
          title: "Thanks for dining with us",
          body: "Tap here to leave a quick Google review.",
          requireInteraction: false,
          tag: `queue-review-${queueId}`,
          data: {
            clickPath: GOOGLE_REVIEW_URL,
          },
        },
      },
      data: {
        queueId,
        status: "seated",
        clickPath: GOOGLE_REVIEW_URL,
      },
    };
  }

  return {
    logLabel: "Table-ready push notification sent.",
    webpush: {
      headers: {
        Urgency: "high",
      },
      notification: {
        title: "Your table is ready",
        body: "Please come to the front desk.",
        requireInteraction: true,
        tag: `queue-${queueId}`,
        data: {
          clickPath: `/status?id=${queueId}`,
        },
      },
    },
    data: {
      queueId,
      status: "notified",
      clickPath: `/status?id=${queueId}`,
    },
  };
}

export const sendQueueStatusNotification = onDocumentUpdated(
  "queue/{queueId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (
      !after ||
      before?.status === after.status ||
      !["notified", "seated"].includes(after.status)
    ) {
      return;
    }

    if (!after.fcmToken) {
      logger.info("Skipping push notification because no FCM token is stored.", {
        queueId: event.params.queueId,
      });
      return;
    }

    try {
      const payload = buildNotificationPayload(event.params.queueId, after.status);

      await getMessaging().send({
        token: after.fcmToken,
        webpush: payload.webpush,
        data: payload.data,
      });

      logger.info(payload.logLabel, {
        queueId: event.params.queueId,
        status: after.status,
      });
    } catch (error) {
      logger.error("Failed to send FCM queue notification.", error);
    }
  }
);

export const syncQueueEntryByDate = onDocumentWritten(
  "queue/{queueId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const queueId = event.params.queueId;
    const batch = adminDb.batch();

    if (before?.queueDate && (!after || after.queueDate !== before.queueDate)) {
      batch.delete(
        adminDb.doc(`queue_by_date/${before.queueDate}/entries/${queueId}`)
      );
    }

    if (after?.queueDate) {
      batch.set(
        adminDb.doc(`queue_by_date/${after.queueDate}/entries/${queueId}`),
        {
          ...after,
          queueId,
        }
      );
    }

    await batch.commit();
  }
);
