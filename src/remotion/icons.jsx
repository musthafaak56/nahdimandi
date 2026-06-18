// Minimal, consistent line icons for the pitch video (no emoji).
// 24x24 viewBox, stroke-based, inherits the `color` prop.
const PATHS = {
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v.5" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="13" y2="14" />
    </>
  ),
  phone: (
    <path d="M5 4h3.5l1.6 4-2.2 1.4a11 11 0 0 0 4.7 4.7L15 16l4 1.5V21a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 6.2 2 2 0 0 1 5 4z" />
  ),
  users: (
    <>
      <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 19v-1a4 4 0 0 0-3-3.87" />
      <path d="M16 4.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  cost: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="6" y1="9" x2="6" y2="15" />
      <line x1="18" y1="9" x2="18" y2="15" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2 20h20L12 3z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  frown: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 15.5s1.4-2 3.5-2 3.5 2 3.5 2" />
      <line x1="9" y1="9.5" x2="9.01" y2="9.5" />
      <line x1="15" y1="9.5" x2="15.01" y2="9.5" />
    </>
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  pin: (
    <>
      <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </>
  ),
  cursor: (
    <>
      <path d="M4 4l7 16 2-6 6-2L4 4z" />
    </>
  ),
  chart: (
    <>
      <line x1="4" y1="20" x2="20" y2="20" />
      <line x1="7" y1="20" x2="7" y2="13" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="17" y1="20" x2="17" y2="11" />
    </>
  ),
  star: (
    <path d="M12 3.5l2.6 5.7 6.2.6-4.7 4.1 1.4 6.1L12 16.9l-5.5 3.1 1.4-6.1L3.2 9.8l6.2-.6L12 3.5z" />
  ),
};

export function Icon({ name, size = 28, color = "currentColor", strokeWidth = 1.8, fill = "none" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
