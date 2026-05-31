export function normalizePhoneNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (digits.length > 10 && digits.startsWith("91")) {
    return digits.slice(-10);
  }

  return digits;
}

export function formatPhoneNumber(value) {
  return normalizePhoneNumber(value);
}

export function buildPhoneCallHref(value) {
  const localNumber = normalizePhoneNumber(value);

  return localNumber ? `tel:+91${localNumber}` : null;
}
