# Nahdi Mandi Queue

Real-time restaurant queue management built with React, Firestore, Firebase Authentication, and Firebase Cloud Messaging.

## Features

- Public queue check-in form at `/` and `/join`
- Live customer status page at `/status?id={queueId}`
- Browser push notification opt-in using Firebase Cloud Messaging
- Table-ready countdown and live location confirmation on the customer status page
- Protected admin login at `/admin/login`
- Real-time admin dashboard at `/admin`
- Paginated queue history with day filtering
- All-time analytics for peak hours, peak days, and peak dates
- Local 10-digit phone entry, with admin call actions dialing `+91`
- Editable test geofence settings from the admin secret modal

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in your Firebase web app config and VAPID key.
3. Install packages in the root app.
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
6. Deploy the site and Firestore rules.

## Firestore model

### Date-scoped queue collection

`customers_per_day/{dateKey}/entries/{queueId}`

- `name`
- `phone`
- `partySize`
- `queueDate`
- `queueNumber`
- `status`
- `timestamp`
- `ownerUid`
- `joinSource`
- `locationMode`
- `storeName`
- `location`
- `tableReadyLocation`
- `tableReadyCheckedAt`
- `respondedAt`
- `fcmToken`
- `fcmTokenUpdatedAt`

### Public queue mirror

`queue_public/{queueId}`

- `partySize`
- `queueDate`
- `queueNumber`
- `status`
- `timestamp`

The public mirror exposes only queue order data so customers can see position updates without reading other guests' personal details.

### Queue counter

`queue_counters/{dateKey}`

- `lastQueueNumber`
- `lastEntryId`
- `lastOwnerUid`
- `updatedAt`

This keeps queue numbers sequential within each restaurant day.

### Queue settings

`settings/queue`

- `locationMode`
- `notifiedTimeoutSeconds`
- `testLocationLatitude`
- `testLocationLongitude`
- `testLocationRadiusMeters`

The test location fields control the editable geofence used in test mode from the admin secret modal.
# nahdimandi
