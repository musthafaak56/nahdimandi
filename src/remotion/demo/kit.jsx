import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, warmBackground, darkBackground } from "../theme";
import { useEnter } from "../ui";

// Greens for the customer "table ready" screen (matches live status page).
export const green = {
  ink: "#2f5d43",
  mid: "#5f8d6e",
  line: "#bcd8c4",
  soft: "#e6f1e8",
  pale: "#f1f7f2",
};
// Blue accent for the Google-review screen.
export const blue = "#2f6fb0";

/* ---------------- Phone shell ---------------- */
export function PhoneFrame({ children, screenBg = "#ffffff", accent }) {
  return (
    <div
      style={{
        width: 430,
        height: 880,
        borderRadius: 56,
        background: "#0a0a0c",
        padding: 13,
        position: "relative",
        boxShadow: "0 50px 120px rgba(0,0,0,0.40)",
      }}
    >
      {accent && (
        <div
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: 60,
            boxShadow: `0 0 90px ${accent}`,
            opacity: 0.55,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 44,
          overflow: "hidden",
          background: screenBg,
          fontFamily: fonts.body,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            width: 118,
            height: 30,
            borderRadius: 18,
            background: "#0a0a0c",
            zIndex: 30,
          }}
        />
        {children}
      </div>
    </div>
  );
}

/* ---------------- Tap indicator ---------------- */
// A finger-tap dot with an outward ripple, positioned by % inside the phone.
export function Tap({ leftPct, topPct, tapAt, color = "rgba(31,19,13,0.85)" }) {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [tapAt - 16, tapAt - 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ripple = interpolate(frame, [tapAt, tapAt + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const press = interpolate(frame, [tapAt - 4, tapAt, tapAt + 9], [1, 0.78, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gone = interpolate(frame, [tapAt + 30, tapAt + 46], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 40,
        opacity: appear * gone,
        pointerEvents: "none",
      }}
    >
      {ripple > 0 && ripple < 1 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 96,
            height: 96,
            marginLeft: -48,
            marginTop: -48,
            borderRadius: "50%",
            border: `3px solid ${color}`,
            transform: `scale(${0.3 + ripple * 1.2})`,
            opacity: 1 - ripple,
          }}
        />
      )}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: color.replace("0.85", "0.28"),
          border: `2.5px solid ${color}`,
          transform: `scale(${press})`,
        }}
      />
    </div>
  );
}

/* ---------------- Scene stage (caption + phone) ---------------- */
export function Stage({ stepNo, total = 6, eyebrow, title, subtitle, view = "customer", accent, children }) {
  const dark = view === "staff";
  const bg = dark ? darkBackground : warmBackground;
  const textMain = dark ? colors.adminText : colors.ink;
  const textMute = dark ? colors.adminMute : colors.clove;
  const accentColor = accent || (dark ? colors.adminCyan : colors.ember);

  const eb = useEnter(4, { y: 24 });
  const ti = useEnter(12, { y: 38 });
  const su = useEnter(22, { y: 30 });
  const num = useEnter(0, { y: 20 });

  return (
    <AbsoluteFill style={{ background: bg, fontFamily: fonts.body }}>
      {/* Left caption panel */}
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 0,
          bottom: 0,
          width: 760,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ ...num, display: "flex", alignItems: "baseline", gap: 14, marginBottom: 26 }}>
          <span style={{ fontFamily: fonts.display, fontSize: 70, fontWeight: 700, color: accentColor, lineHeight: 1 }}>
            {String(stepNo).padStart(2, "0")}
          </span>
          <span style={{ fontFamily: fonts.mono, fontSize: 24, color: textMute, letterSpacing: 2 }}>
            / {String(total).padStart(2, "0")}
          </span>
        </div>
        <div
          style={{
            ...eb,
            fontFamily: fonts.mono,
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: accentColor,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span style={{ width: 40, height: 3, borderRadius: 3, background: accentColor }} />
          {eyebrow}
        </div>
        <div
          style={{
            ...ti,
            marginTop: 22,
            fontFamily: fonts.display,
            fontSize: 78,
            fontWeight: 700,
            lineHeight: 1.04,
            color: textMain,
            letterSpacing: -1,
          }}
        >
          {title}
        </div>
        <div style={{ ...su, marginTop: 26, fontSize: 30, lineHeight: 1.5, color: textMute, maxWidth: 660 }}>
          {subtitle}
        </div>
      </div>

      {/* Phone stage on the right */}
      <div
        style={{
          position: "absolute",
          right: 150,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- Small atoms ---------------- */
export function Pill({ children, color, bg, border, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 999,
        fontFamily: fonts.mono,
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: 2,
        color,
        background: bg,
        border: `1px solid ${border || color}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
