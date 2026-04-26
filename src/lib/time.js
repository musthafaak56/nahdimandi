function toMillis(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  return null;
}

export function formatElapsed(value) {
  const millis = toMillis(value);

  if (!millis) {
    return "moments";
  }

  const diff = Math.max(0, Date.now() - millis);

  if (diff < 45_000) {
    return "moments";
  }

  if (diff < 3_600_000) {
    const minutes = Math.max(1, Math.round(diff / 60_000));
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
  }

  if (diff < 86_400_000) {
    const hours = Math.max(1, Math.round(diff / 3_600_000));
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  const days = Math.max(1, Math.round(diff / 86_400_000));
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function formatJoinedLabel(value) {
  const elapsed = formatElapsed(value);
  return elapsed === "moments" ? "Joined just now" : `Joined ${elapsed} ago`;
}

export function formatClock(value) {
  const millis = toMillis(value);

  if (!millis) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(millis);
}
