const ERROR_MESSAGES = {
  "auth/invalid-login-credentials": "The admin email or password is incorrect.",
  "auth/too-many-requests":
    "Too many login attempts. Wait a moment and try again.",
  "auth/network-request-failed":
    "The server could not be reached. Check your connection and config.",
  "permission-denied":
    "This queue entry belongs to a different browser session or device.",
  "not-found": "That queue entry no longer exists.",
  unavailable: "The server is temporarily unavailable. Try again shortly.",
};

export function getFriendlyError(error, fallback = "Something went wrong.") {
  if (!error) {
    return fallback;
  }

  // To debug the Admin dashboard issue, show the real message
  return ERROR_MESSAGES[error.code] || `[DEBUG] ${error.message} - ${fallback}`;
}
