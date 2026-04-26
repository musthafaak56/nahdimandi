# Nahdi Mandi Queue

Real-time restaurant queue management built with React, Firestore, Firebase Authentication, and Firebase Cloud Messaging.

## Features

- Public queue check-in form at `/` and `/join`
- Live customer status page at `/status?id={queueId}`
- Browser push notification opt-in using Firebase Cloud Messaging
- Protected admin login at `/admin/login`
- Real-time admin dashboard at `/admin`
- Cloud Function that sends a table-ready push when an entry changes to `notified`

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in your Firebase web app config and VAPID key.
3. Install packages in the root app and in `functions/`.
4. Run `npm run dev` for the frontend.

## Firebase setup checklist

1. Enable `Authentication` providers:
   - `Anonymous` for customer queue sessions
   - `Email/Password` for admin access
2. Create at least one admin user in Firebase Auth using email/password.
3. Create a Firestore database in production mode or test mode, then deploy:
   - `firestore.rules`
   - `firestore.indexes.json`
4. Enable Firebase Cloud Messaging and create a web push certificate key pair.
5. Add the public VAPID key to `VITE_FIREBASE_VAPID_KEY`.
6. Deploy the Cloud Function from `functions/index.js`.

## Firestore model

### Private queue collection

`queue/{queueId}`

- `name`
- `phone`
- `partySize`
- `status`
- `timestamp`
- `ownerUid`
- `fcmToken`
- `fcmTokenUpdatedAt`

### Public queue mirror

`queue_public/{queueId}`

- `partySize`
- `status`
- `timestamp`

The public mirror exposes only queue order data so customers can see position updates without reading other guests' personal details.
# nahdimandi
