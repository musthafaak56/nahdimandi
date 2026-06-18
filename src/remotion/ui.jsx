import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "./theme";

// Spring-driven entrance: returns {opacity, transform} for a frame.
export function useEnter(delay = 0, { y = 40, damping = 16 } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping, mass: 0.7, stiffness: 120 },
  });
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * y}px)`,
  };
}

// Eased fade-in over a window of frames.
export function useFade(start, durationFrames = 12) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// Animated counter that springs from 0 -> value.
export function useCount(value, delay = 0, durationFrames = 40) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [delay, delay + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  return value * t;
}

// Wrapper that fills the frame with a background + centered padding.
export function Scene({ background, children, style }) {
  return (
    <AbsoluteFill
      style={{
        background,
        fontFamily: fonts.body,
        color: colors.ink,
        padding: "90px 120px",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

// Small uppercase eyebrow label used at the top of scenes.
export function Eyebrow({ children, dark = false, delay = 0 }) {
  const enter = useEnter(delay, { y: 20 });
  return (
    <div
      style={{
        ...enter,
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        fontFamily: fonts.mono,
        fontSize: 24,
        fontWeight: 500,
        letterSpacing: 6,
        textTransform: "uppercase",
        color: dark ? colors.adminCyan : colors.ember,
      }}
    >
      <span
        style={{
          width: 46,
          height: 3,
          borderRadius: 3,
          background: dark ? colors.adminCyan : colors.ember,
        }}
      />
      {children}
    </div>
  );
}

// Animated brand badge (queue ticket motif) used in hero + outro.
export function Badge({ delay = 0, size = 132 }) {
  const enter = useEnter(delay, { y: 0, damping: 12 });
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 12) * 0.03;
  return (
    <div
      style={{
        ...enter,
        width: size,
        height: size,
        borderRadius: 34,
        background: `linear-gradient(150deg, ${colors.ember}, ${colors.clove})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 24px 60px rgba(181, 90, 29, 0.42)",
        transform: `${enter.transform} scale(${pulse})`,
        color: colors.white,
        fontFamily: fonts.display,
        fontWeight: 700,
        fontSize: size * 0.5,
      }}
    >
      N
    </div>
  );
}
