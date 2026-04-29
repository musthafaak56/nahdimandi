const ERROR_MESSAGES = {
  "auth/invalid-login-credentials": "The admin email or password is incorrect.",
  "auth/too-many-requests":
    "Too many login attempts. Wait a moment and try again.",
  "auth/network-request-failed":
    "The server could not be reached. Check your connection and config.",
  "permission-denied":
    "The app does not have permission to read this queue entry yet. Please refresh and try again.",
  "not-found": "That queue entry no longer exists.",
  unavailable: "The server is temporarily unavailable. Try again shortly.",
};

export function getFriendlyError(error, fallback = "Something went wrong.") {
  if (!error) {
    return fallback;
  }

  return ERROR_MESSAGES[error.code] || fallback;
}
