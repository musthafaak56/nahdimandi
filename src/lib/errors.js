const ERROR_MESSAGES = {
  "auth/invalid-login-credentials": "The admin email or password is incorrect.",
  "auth/too-many-requests":
    "Too many login attempts. Wait a moment and try again.",
  "auth/network-request-failed":
    "The server could not be reached. Check your connection and config.",
  "permission-denied":
    "The app could not verify this queue entry yet. Please refresh and try again.",
  internal: "The queue service is temporarily unavailable. Please refresh and try again.",
  "not-found": "That queue entry no longer exists.",
  unavailable: "The server is temporarily unavailable. Try again shortly.",
};

export function getFriendlyError(error, fallback = "Something went wrong.") {
  if (!error) {
    return fallback;
  }

  return (
    ERROR_MESSAGES[error.code] ||
    (typeof error.message === "string" && error.message.trim()) ||
    fallback
  );
}
