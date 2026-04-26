import { initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

initializeApp();

export const sendTableReadyNotification = onDocumentUpdated(
  "queue/{queueId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after || before?.status === after.status || after.status !== "notified") {
      return;
    }

    if (!after.fcmToken) {
      logger.info("Skipping push notification because no FCM token is stored.", {
        queueId: event.params.queueId,
      });
      return;
    }

    try {
      await getMessaging().send({
        token: after.fcmToken,
        webpush: {
          headers: {
            Urgency: "high",
          },
          notification: {
            title: "Your table is ready",
            body: "Please come to the front desk.",
            requireInteraction: true,
            tag: `queue-${event.params.queueId}`,
            data: {
              clickPath: `/status?id=${event.params.queueId}`,
            },
          },
        },
        data: {
          queueId: event.params.queueId,
          status: "notified",
          clickPath: `/status?id=${event.params.queueId}`,
        },
      });

      logger.info("Table-ready push notification sent.", {
        queueId: event.params.queueId,
      });
    } catch (error) {
      logger.error("Failed to send FCM table-ready notification.", error);
    }
  }
);
