import { initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

initializeApp();

const GOOGLE_REVIEW_URL = "https://maps.app.goo.gl/FVabh8HZ7tCmbmhb7?g_st=ic";

function buildNotificationPayload(queueId, queueDate, status) {
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
        queueDate,
        status: "seated",
        clickPath: GOOGLE_REVIEW_URL,
      },
    };
  }

  if (status === "waiting") {
    return {
      logLabel: "Bump-down push notification sent.",
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          title: "You missed your turn",
          body: "You didn't attend the call. Please wait for your turn.",
          requireInteraction: true,
          tag: `queue-bump-${queueId}`,
          data: {
            clickPath: `/status?id=${queueId}&date=${queueDate}`,
          },
        },
      },
      data: {
        queueId,
        queueDate,
        status: "waiting",
        clickPath: `/status?id=${queueId}&date=${queueDate}`,
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
            clickPath: `/status?id=${queueId}&date=${queueDate}`,
          },
        },
      },
      data: {
        queueId,
        queueDate,
        status: "notified",
        clickPath: `/status?id=${queueId}&date=${queueDate}`,
      },
  };
}

export const sendQueueStatusNotification = onDocumentUpdated(
  "customers_per_day/{dateKey}/entries/{queueId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (
      !after ||
      before?.status === after.status ||
      (!["notified", "seated"].includes(after.status) &&
        !(before?.status === "notified" && after.status === "waiting"))
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
      const payload = buildNotificationPayload(
        event.params.queueId,
        event.params.dateKey,
        after.status
      );

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
