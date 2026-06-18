// Brand palette + typography shared across the pitch video scenes.
// Mirrors tailwind.config.js so the video matches the live product.
export const colors = {
  cream: "#f7f0e4",
  sand: "#ead5b7",
  ember: "#b55a1d",
  clove: "#7c3412",
  ink: "#1f130d",
  sage: "#435247",
  brass: "#d4a84d",
  white: "#fffaf2",
  adminBase: "#101820",
   adminSlate: "#1c2733",
  adminLine: "#314153",
  adminText: "#e7eef6",
  adminMute: "#93a8bd",
  adminCyan: "#52c7ea",
  adminMint: "#7ed5a8",
  adminRose: "#ef6c62",
};

export const fonts = {
  display: '"Fraunces", Georgia, serif',
  body: '"Manrope", sans-serif',
  mono: '"Space Grotesk", sans-serif',
};

// Warm radial background used by most light scenes.
export const warmBackground =
  "radial-gradient(circle at 12% 8%, rgba(234, 213, 183, 0.95), transparent 40%)," +
  "radial-gradient(circle at 88% 12%, rgba(181, 90, 29, 0.16), transparent 34%)," +
  "linear-gradient(155deg, #fbf4e8 0%, #f4ead7 48%, #efe1cb 100%)";

export const darkBackground =
  "radial-gradient(circle at 80% 0%, rgba(82, 199, 234, 0.14), transparent 40%)," +
  "radial-gradient(circle at 10% 100%, rgba(181, 90, 29, 0.22), transparent 45%)," +
  "linear-gradient(160deg, #141d12 0%, #101820 55%, #0c1116 100%)";
