import {
  DEFAULT_STORE_LOCATION_MODE,
  getStoreLocation,
} from "../../shared/storeLocations";

export const STORE_LOCATION = getStoreLocation(DEFAULT_STORE_LOCATION_MODE);

export const GEOFENCE_POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
};

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(startLatitude, startLongitude, endLatitude, endLongitude) {
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(endLatitude - startLatitude);
  const longitudeDelta = toRadians(endLongitude - startLongitude);
  const startLatitudeRadians = toRadians(startLatitude);
  const endLatitudeRadians = toRadians(endLatitude);

  const haversineValue =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
}

export function formatDistanceMeters(distanceMeters) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function getCurrentPosition(options = GEOFENCE_POSITION_OPTIONS) {
  if (typeof window === "undefined" || !window.navigator?.geolocation) {
    const unsupportedError = new Error("Geolocation is not available on this device.");
    unsupportedError.code = "geolocation-not-supported";
    throw unsupportedError;
  }

  return new Promise((resolve, reject) => {
    window.navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function getGeolocationErrorMessage(error) {
  if (error?.code === "geolocation-not-supported") {
    return "This device does not support location access, so it cannot join the public queue.";
  }

  switch (error?.code) {
    case 1:
      return "Location access is required to join the public queue near the store.";
    case 2:
      return "Your location could not be determined. Move closer to open sky or try again.";
    case 3:
      return "Location lookup took too long. Please try again.";
    default:
      return "We could not verify that you are near the store. Please try again.";
  }
}

export function buildQueueJoinLocation(coords, storeLocation = STORE_LOCATION) {
  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  const accuracyMeters = Number(coords.accuracy || 0);
  const distanceMeters = calculateDistanceMeters(
    latitude,
    longitude,
    storeLocation.latitude,
    storeLocation.longitude
  );
  const withinRadius = distanceMeters <= storeLocation.radiusMeters;

  return {
    distanceMeters,
    withinRadius,
    location: {
      lat: latitude,
      lng: longitude,
      accuracyMeters,
      distanceMeters,
      withinRadius,
      storeMode: storeLocation.mode,
      storeName: storeLocation.name,
    },
  };
}
