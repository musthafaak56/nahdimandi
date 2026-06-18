export const STORE_LOCATION_MODES = {
  production: {
    mode: "production",
    name: "Nahdi Mandi Kannur",
    latitude: 11.8598637,
    longitude: 75.4147016,
    radiusMeters: 2500,
  },
  test: {
    mode: "test",
    name: "394F+278, Madeena Rd, Kuttiyeri, Kerala 670141",
    latitude: 12.0551063,
    longitude: 75.3731213,
    radiusMeters: 2500,
  },
};

export const DEFAULT_STORE_LOCATION_MODE = "production";
export const DEFAULT_TEST_STORE_LOCATION = STORE_LOCATION_MODES.test;

export function normalizeRadiusMeters(value, fallback = DEFAULT_TEST_STORE_LOCATION.radiusMeters) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getStoreLocation(mode = DEFAULT_STORE_LOCATION_MODE, overrides = {}) {
  const baseLocation =
    STORE_LOCATION_MODES[mode] || STORE_LOCATION_MODES[DEFAULT_STORE_LOCATION_MODE];

  if (mode !== "test") {
    return baseLocation;
  }

  return {
    ...baseLocation,
    name:
      typeof overrides.testLocationName === "string" && overrides.testLocationName.length > 0
        ? overrides.testLocationName
        : baseLocation.name,
    latitude:
      Number.isFinite(Number(overrides.testLocationLatitude))
        ? Number(overrides.testLocationLatitude)
        : baseLocation.latitude,
    longitude:
      Number.isFinite(Number(overrides.testLocationLongitude))
        ? Number(overrides.testLocationLongitude)
        : baseLocation.longitude,
    radiusMeters: normalizeRadiusMeters(
      overrides.testLocationRadiusMeters,
      baseLocation.radiusMeters
    ),
  };
}

export function normalizeStoreLocationMode(mode) {
  return STORE_LOCATION_MODES[mode] ? mode : DEFAULT_STORE_LOCATION_MODE;
}
