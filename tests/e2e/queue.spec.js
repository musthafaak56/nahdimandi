import { expect, test } from "@playwright/test";
import { STORE_LOCATION_MODES } from "../../shared/storeLocations.js";

const ADMIN_CREDENTIALS = {
  email: "admin@nahdi.test",
  password: "password123",
};

const SUPER_ADMIN_CREDENTIALS = {
  email: "musthafaak56@gmail.com",
  password: "password123",
};

const STORE = STORE_LOCATION_MODES.production;
const DATE_KEY = restaurantDateKey();

function restaurantDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function secondsAgo(seconds) {
  return new Date(Date.now() - seconds * 1_000).toISOString();
}

function buildEntry(overrides = {}) {
  return {
    id: overrides.id,
    name: overrides.name || "Guest",
    phone: overrides.phone || "8281851282",
    partySize: overrides.partySize || 2,
    queueDate: overrides.queueDate || DATE_KEY,
    queueNumber: overrides.queueNumber || 1,
    status: overrides.status || "waiting",
    timestamp: overrides.timestamp || minutesAgo(10),
    ownerUid: overrides.ownerUid || "e2e-anonymous",
    joinSource: overrides.joinSource || "public",
    locationMode: overrides.locationMode || "production",
    storeName: overrides.storeName || STORE.name,
    location:
      overrides.location === undefined
        ? {
            lat: STORE.latitude,
            lng: STORE.longitude,
            accuracyMeters: 8,
            distanceMeters: 0,
            withinRadius: true,
            storeMode: "production",
            storeName: STORE.name,
          }
        : overrides.location,
    notifiedAt: overrides.notifiedAt,
    notifiedTimeoutSeconds: overrides.notifiedTimeoutSeconds,
    tableReadyLocation: overrides.tableReadyLocation,
    tableReadyCheckedAt: overrides.tableReadyCheckedAt,
    respondedAt: overrides.respondedAt,
  };
}

function buildTicket(overrides = {}) {
  return {
    id: overrides.id,
    subject: overrides.subject || "Support ticket",
    message: overrides.message || "Support ticket message",
    contactPhone: overrides.contactPhone || "+918281851272",
    portfolioUrl: overrides.portfolioUrl || "https://musthafa-portfolio.web.app",
    ticketToEmail: overrides.ticketToEmail || SUPER_ADMIN_CREDENTIALS.email,
    fromUid: overrides.fromUid || "e2e-admin",
    fromEmail: overrides.fromEmail || ADMIN_CREDENTIALS.email,
    fromDisplayName: overrides.fromDisplayName || "Test Admin",
    status: overrides.status || "open",
    createdAt: overrides.createdAt || minutesAgo(20),
    updatedAt: overrides.updatedAt || minutesAgo(20),
    resolvedAt: overrides.resolvedAt,
  };
}

function buildRuntime(seed = {}) {
  return {
    enabled: true,
    seed: {
      dateKey: DATE_KEY,
      queueSettings: {
        locationMode: "production",
        notifiedTimeoutSeconds: 30,
        testLocationLatitude: STORE.latitude,
        testLocationLongitude: STORE.longitude,
        testLocationRadiusMeters: STORE.radiusMeters,
      },
      adminCredentials: ADMIN_CREDENTIALS,
      queueEntries: [],
      supportTickets: [],
      ...seed,
    },
  };
}

async function setupE2EPage(page, {
  runtime,
  geolocation = { latitude: STORE.latitude, longitude: STORE.longitude, accuracy: 8 },
  permissionState = "granted",
  locationError = null,
  confirm = true,
} = {}) {
  await page.addInitScript(
    ({ runtime: nextRuntime, geolocation: nextGeolocation, permissionState: nextPermissionState, locationError: nextLocationError, confirm: nextConfirm }) => {
      window.__NAHDI_E2E__ = nextRuntime;

      Object.defineProperty(window.navigator, "permissions", {
        configurable: true,
        value: {
          query: async () => ({
            state: nextPermissionState,
            onchange: null,
          }),
        },
      });

      Object.defineProperty(window.navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition(success, error) {
            if (nextLocationError) {
              error?.(nextLocationError);
              return;
            }

            success({
              coords: {
                latitude: nextGeolocation.latitude,
                longitude: nextGeolocation.longitude,
                accuracy: nextGeolocation.accuracy || 0,
              },
            });
          },
        },
      });

      window.confirm = () => nextConfirm;
    },
    {
      runtime,
      geolocation,
      permissionState,
      locationError,
      confirm,
    }
  );
}

test.describe("Public queue", () => {
  test("validates inputs, joins the queue, and restores the status link", async ({ page }) => {
    const runtime = buildRuntime({
      queueEntries: [
        buildEntry({
          id: "seed-1",
          name: "Asha",
          queueNumber: 1,
          timestamp: minutesAgo(30),
        }),
      ],
    });

    await setupE2EPage(page, { runtime });
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Location access granted" })).toBeVisible();

    await page.getByLabel("Guest name").fill("A");
    await page.getByLabel("Phone number").fill("123");
    await page.getByRole("button", { name: "Join the queue" }).click();
    await expect(page.getByText("Please enter the guest name.")).toBeVisible();

    await page.getByLabel("Guest name").fill("Amina");
    await page.getByRole("button", { name: "Join the queue" }).click();
    await expect(page.getByText("Please enter a 10-digit phone number.")).toBeVisible();

    await page.getByLabel("Phone number").fill("8281851282");
    await page.getByRole("button", { name: "Join the queue" }).click();

    await expect(page).toHaveURL(/\/status\?id=queue-\d+&date=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("heading", { name: /You are #2 in line\./ })).toBeVisible();
    await expect(page.getByText("You're in the queue! We'll notify you when your table is ready.")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Resume status" })).toBeVisible();
  });

  test("shows a clear error when location access is denied", async ({ page }) => {
    const runtime = buildRuntime();

    await setupE2EPage(page, {
      runtime,
      permissionState: "denied",
      locationError: { code: 1, message: "denied" },
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Allow location access" }).click();

    await expect(page.getByText("Location access is required to join the public queue near the store.")).toBeVisible();
    await expect(page.getByText("location access is already blocked for this site")).toBeVisible();
  });

  test("blocks a join request when the guest is outside the geofence", async ({ page }) => {
    const runtime = buildRuntime();

    await setupE2EPage(page, {
      runtime,
      geolocation: {
        latitude: STORE.latitude + 0.4,
        longitude: STORE.longitude + 0.4,
        accuracy: 12,
      },
      permissionState: "granted",
    });

    await page.goto("/");
    await page.getByLabel("Guest name").fill("Nadia");
    await page.getByLabel("Phone number").fill("8281851282");
    await page.getByRole("button", { name: "Join the queue" }).click();

    await expect(page.getByText("Queue check-in is only available within")).toBeVisible();
  });
});

test.describe("Status page", () => {
  test("shows an error when the queue reference is missing", async ({ page }) => {
    const runtime = buildRuntime();
    await setupE2EPage(page, { runtime });

    await page.goto("/status");
    await expect(page.getByText("Missing queue reference.")).toBeVisible();
  });

  test("shows a not found error for an unknown queue entry", async ({ page }) => {
    const runtime = buildRuntime();
    await setupE2EPage(page, { runtime });

    await page.goto(`/status?id=missing-entry&date=${DATE_KEY}`);
    await expect(page.getByText("That queue entry could not be found.")).toBeVisible();
  });

  test("keeps a waiting guest informed and enables browser alerts", async ({ page }) => {
    const runtime = buildRuntime({
      queueEntries: [
        buildEntry({
          id: "waiting-1",
          name: "Asha",
          queueNumber: 1,
          timestamp: minutesAgo(20),
        }),
        buildEntry({
          id: "waiting-2",
          name: "Amina",
          queueNumber: 2,
          timestamp: minutesAgo(10),
        }),
      ],
    });

    await setupE2EPage(page, { runtime });
    await page.goto(`/status?id=waiting-2&date=${DATE_KEY}`);

    await expect(page.getByRole("heading", { name: "You are #2 in line." })).toBeVisible();
    await expect(page.getByText("1 party is ahead of you right now.")).toBeVisible();

    await page.getByRole("button", { name: "Enable browser alerts" }).click();
    await expect(page.getByRole("button", { name: "Notifications enabled" })).toBeVisible();
  });

  test("shows the table-ready overlay and live arrival check", async ({ page }) => {
    const runtime = buildRuntime({
      queueEntries: [
        buildEntry({
          id: "ready-1",
          name: "Basil",
          queueNumber: 1,
          status: "notified",
          timestamp: minutesAgo(15),
          notifiedAt: secondsAgo(5),
          notifiedTimeoutSeconds: 45,
        }),
      ],
    });

    await setupE2EPage(page, { runtime });
    await page.goto(`/status?id=ready-1&date=${DATE_KEY}`);

    await expect(page.getByRole("heading", { name: "Your table is ready." }).first()).toBeVisible();
    await expect(page.getByText("Location confirmed. You are about 0 m away and within the arrival zone.")).toBeVisible();
  });

  test("shows the review prompt after seating", async ({ page }) => {
    const runtime = buildRuntime({
      queueEntries: [
        buildEntry({
          id: "seated-1",
          name: "Cora",
          queueNumber: 1,
          status: "seated",
          timestamp: minutesAgo(40),
          respondedAt: minutesAgo(5),
        }),
      ],
    });

    await setupE2EPage(page, { runtime });
    await page.goto(`/status?id=seated-1&date=${DATE_KEY}`);

    await expect(page.getByRole("heading", { name: "Would you leave a quick review?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Leave a Google review" }).first()).toBeVisible();
  });

  test("shows the removed state for cancelled entries", async ({ page }) => {
    const runtime = buildRuntime({
      queueEntries: [
        buildEntry({
          id: "cancelled-1",
          name: "Dina",
          queueNumber: 1,
          status: "cancelled",
          timestamp: minutesAgo(25),
          respondedAt: minutesAgo(5),
        }),
      ],
    });

    await setupE2EPage(page, { runtime });
    await page.goto(`/status?id=cancelled-1&date=${DATE_KEY}`);

    await expect(page.getByRole("heading", { name: "This queue entry has been removed." })).toBeVisible();
  });
});

test.describe("Admin dashboard", () => {
  test("lets an admin update the test location and switch back to production from the secret modal", async ({ page }) => {
    const runtime = buildRuntime({
      adminCredentials: ADMIN_CREDENTIALS,
      queueSettings: {
        locationMode: "test",
      },
    });

    await setupE2EPage(page, { runtime });
    await page.goto("/admin");

    await page.getByLabel("Email").fill(ADMIN_CREDENTIALS.email);
    await page.getByLabel("Password").fill(ADMIN_CREDENTIALS.password);
    await page.getByRole("button", { name: "Enter dashboard" }).click();

    await expect(page).toHaveURL(/\/admin$/);

    for (let index = 0; index < 8; index += 1) {
      await page.getByRole("button", { name: "Add party" }).click();
    }

    await expect(page.getByRole("heading", { name: "Switch test or production" })).toBeVisible();
    await page.getByRole("button", { name: "Edit test location" }).click();
    await page.getByLabel("Latitude").fill("12.123456");
    await page.getByLabel("Longitude").fill("75.654321");
    await page.getByLabel("Radius (m)").fill("1800");
    await page.getByRole("button", { name: "Save test location" }).click();

    await expect(page.getByRole("heading", { name: "Switch test or production" })).toHaveCount(0);

    for (let index = 0; index < 8; index += 1) {
      await page.getByRole("button", { name: "Add party" }).click();
    }

    await expect(page.getByLabel("Latitude")).toHaveValue("12.123456");
    await expect(page.getByLabel("Longitude")).toHaveValue("75.654321");
    await expect(page.getByLabel("Radius (m)")).toHaveValue("1800");

    for (let index = 0; index < 8; index += 1) {
      await page.getByRole("button", { name: "Add party" }).click();
    }

    await page.getByRole("button", { name: "Use Production Location" }).click();

    await expect(page.getByRole("heading", { name: "Switch test or production" })).toHaveCount(0);

    for (let index = 0; index < 8; index += 1) {
      await page.getByRole("button", { name: "Add party" }).click();
    }

    await expect(page.getByRole("button", { name: "Use Production Location" })).toContainText("Active");
  });

  test("handles login, live queue actions, history pagination, and ticket creation", async ({ page }) => {
    const runtime = buildRuntime({
      adminCredentials: ADMIN_CREDENTIALS,
      queueEntries: [
        buildEntry({
          id: "dash-1",
          name: "Asha",
          queueNumber: 1,
          timestamp: minutesAgo(80),
        }),
        buildEntry({
          id: "dash-2",
          name: "Basil",
          queueNumber: 2,
          timestamp: minutesAgo(70),
        }),
        buildEntry({
          id: "dash-3",
          name: "Cyrus",
          queueNumber: 3,
          status: "notified",
          timestamp: minutesAgo(60),
          notifiedAt: minutesAgo(2),
          notifiedTimeoutSeconds: 60,
        }),
        buildEntry({
          id: "dash-4",
          name: "Dina",
          queueNumber: 4,
          timestamp: minutesAgo(50),
        }),
        buildEntry({
          id: "hist-5",
          name: "Esha",
          queueNumber: 5,
          status: "seated",
          timestamp: minutesAgo(45),
          respondedAt: minutesAgo(40),
        }),
        buildEntry({
          id: "hist-6",
          name: "Faiz",
          queueNumber: 6,
          status: "cancelled",
          timestamp: minutesAgo(40),
          respondedAt: minutesAgo(35),
        }),
        buildEntry({
          id: "hist-7",
          name: "Gita",
          queueNumber: 7,
          timestamp: minutesAgo(35),
        }),
        buildEntry({
          id: "hist-8",
          name: "Hamid",
          queueNumber: 8,
          timestamp: minutesAgo(30),
        }),
        buildEntry({
          id: "hist-9",
          name: "Iris",
          queueNumber: 9,
          status: "seated",
          timestamp: minutesAgo(25),
          respondedAt: minutesAgo(20),
        }),
        buildEntry({
          id: "hist-10",
          name: "Javed",
          queueNumber: 10,
          status: "cancelled",
          timestamp: minutesAgo(20),
          respondedAt: minutesAgo(18),
        }),
        buildEntry({
          id: "hist-11",
          name: "Kiran",
          queueNumber: 11,
          timestamp: minutesAgo(15),
        }),
        buildEntry({
          id: "hist-12",
          name: "Lina",
          queueNumber: 12,
          timestamp: minutesAgo(10),
        }),
      ],
    });

    await setupE2EPage(page, { runtime });
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Enter dashboard" }).click();
    await expect(page.getByText("The admin email or password is incorrect.")).toBeVisible();

    await page.getByLabel("Email").fill(ADMIN_CREDENTIALS.email);
    await page.getByLabel("Password").fill(ADMIN_CREDENTIALS.password);
    await page.getByRole("button", { name: "Enter dashboard" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Live queue dashboard" })).toBeVisible();

    const ashaCard = page.locator("article").filter({ hasText: "Asha" }).first();
    const basilCard = page.locator("article").filter({ hasText: "Basil" }).first();
    const cyrusCard = page.locator("article").filter({ hasText: "Cyrus" }).first();
    const dinaCard = page.locator("article").filter({ hasText: "Dina" }).first();

    await ashaCard.getByRole("button", { name: "Table Ready" }).click();
    await expect(ashaCard).toContainText("Notified");

    await basilCard.getByRole("button", { name: "Seated" }).click();
    await expect(basilCard).toHaveCount(0);

    await cyrusCard.getByRole("button", { name: "Didn't Attend" }).click();
    await expect(cyrusCard).toContainText("Waiting");

    await dinaCard.getByRole("button", { name: "Remove" }).click();
    await expect(dinaCard).toHaveCount(0);

    await page.getByRole("button", { name: "History & Analytics" }).click();
    await expect(page.getByText(`Page 1 · Showing entries 1-10 for ${DATE_KEY}`)).toBeVisible();
    await expect(page.getByText("Total Joined")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(`Page 2 · Showing entries 11-12 for ${DATE_KEY}`)).toBeVisible();

    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByText(`Page 1 · Showing entries 1-10 for ${DATE_KEY}`)).toBeVisible();

    await page.getByRole("button", { name: "Contact" }).click();
    await expect(page.getByRole("heading", { name: "Raise an internal ticket" })).toBeVisible();
    await expect(page.getByText("Super-admin inbox")).toHaveCount(0);

    await page.getByLabel("Ticket subject").fill("Printer issue");
    await page.getByLabel("Ticket details").fill("The queue printer stopped printing tickets.");
    await page.getByRole("button", { name: "Send internal ticket" }).click();
    await expect(page.getByText("Ticket sent.")).toBeVisible();
  });

  test("shows support tickets to the super admin and lets them update status", async ({ page }) => {
    const runtime = buildRuntime({
      adminCredentials: SUPER_ADMIN_CREDENTIALS,
      supportTickets: [
        buildTicket({
          id: "ticket-1",
          subject: "Queue printer offline",
          message: "Printer is offline at the front desk.",
          status: "open",
        }),
        buildTicket({
          id: "ticket-2",
          subject: "Need more staff",
          message: "Rush is heavier than expected tonight.",
          status: "resolved",
          resolvedAt: minutesAgo(3),
        }),
      ],
    });

    await setupE2EPage(page, { runtime });
    await page.goto("/admin/login");

    await page.getByLabel("Email").fill(SUPER_ADMIN_CREDENTIALS.email);
    await page.getByLabel("Password").fill(SUPER_ADMIN_CREDENTIALS.password);
    await page.getByRole("button", { name: "Enter dashboard" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: "Contact" }).click();

    await expect(page.getByRole("heading", { name: "Internal tickets waiting for review" })).toBeVisible();
    await expect(page.getByText("Queue printer offline")).toBeVisible();
    await expect(page.getByText("Need more staff")).toBeVisible();

    const ticketCard = page.locator("article").filter({ hasText: "Queue printer offline" }).first();
    await ticketCard.getByRole("button", { name: "Mark resolved" }).click();
    await expect(ticketCard.getByRole("button", { name: "Reopen" })).toBeVisible();
  });
});
