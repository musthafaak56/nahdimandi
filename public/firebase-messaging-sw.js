/* global firebase, importScripts */

const searchParams = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: searchParams.get("apiKey"),
  appId: searchParams.get("appId"),
  authDomain: searchParams.get("authDomain"),
  messagingSenderId: searchParams.get("messagingSenderId"),
  projectId: searchParams.get("projectId"),
  storageBucket: searchParams.get("storageBucket"),
};

const hasConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.appId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.projectId
);

if (hasConfig) {
  importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
  importScripts(
    "https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js"
  );

  firebase.initializeApp(firebaseConfig);
  firebase.messaging();
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = event.notification?.data?.clickPath || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          const url = new URL(client.url);

          if (url.pathname === targetPath.split("?")[0]) {
            return client.navigate(targetPath).then(() => client.focus());
          }
        }

        return self.clients.openWindow(targetPath);
      })
  );
});
