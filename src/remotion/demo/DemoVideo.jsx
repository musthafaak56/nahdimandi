import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { colors, fonts, darkBackground } from "../theme";
import { Badge, useEnter } from "../ui";
import { PhoneFrame, Stage, Tap, green, blue } from "./kit";
import { AdminScreen, JoinScreen, QRScreen, ReviewScreen, TableReadyScreen } from "./screens";

export const FPS = 30;
const T = 16;

/* ---------------- Scenes ---------------- */
function S1_Scan() {
  return (
    <Stage
      stepNo={1}
      eyebrow="Scan to start"
      title="Scan the QR to join"
      subtitle="No app, no signup. The phone camera opens a lightweight web app for Nahdi Mandi."
    >
      <PhoneFrame screenBg="#f7f0e4" accent={colors.ember}>
        <QRScreen />
      </PhoneFrame>
    </Stage>
  );
}

function S2_Join() {
  return (
    <Stage
      stepNo={2}
      eyebrow="Enter the queue"
      title="Join in seconds"
      subtitle="Name, phone and party size — that's it. Location is verified automatically within 2.5 km."
    >
      <PhoneFrame screenBg="#f7f0e4" accent={colors.ember}>
        <JoinScreen />
        <Tap leftPct={50} topPct={74} tapAt={104} color="rgba(31,19,13,0.85)" />
      </PhoneFrame>
    </Stage>
  );
}

function S3_AdminReady() {
  return (
    <Stage
      stepNo={3}
      eyebrow="On the floor"
      title="Staff marks it ready"
      subtitle="The request lands on the live dashboard instantly. One tap on Table Ready alerts the guest."
      view="staff"
    >
      <PhoneFrame screenBg="#101820" accent={colors.adminCyan}>
        <AdminScreen mode="ready" tapAt={70} />
        <Tap leftPct={52} topPct={47} tapAt={70} color="rgba(255,255,255,0.9)" />
      </PhoneFrame>
    </Stage>
  );
}

function S4_TableReady() {
  return (
    <Stage
      stepNo={4}
      eyebrow="Instant alert"
      title="The guest is notified"
      subtitle="A real-time notification with a 30-second arrival timer — no more shouting names across the room."
      view="customer"
      accent={green.mid}
    >
      <PhoneFrame screenBg={green.pale} accent={green.mid}>
        <TableReadyScreen startSeconds={30} />
      </PhoneFrame>
    </Stage>
  );
}

function S5_AdminSeated() {
  return (
    <Stage
      stepNo={5}
      eyebrow="Close the loop"
      title="Staff seats the guest"
      subtitle="One tap moves the party to seated and clears them from the live queue."
      view="staff"
    >
      <PhoneFrame screenBg="#101820" accent={colors.adminCyan}>
        <AdminScreen mode="seated" tapAt={52} />
        <Tap leftPct={22} topPct={54} tapAt={52} color="rgba(255,255,255,0.9)" />
      </PhoneFrame>
    </Stage>
  );
}

function S6_Review() {
  return (
    <Stage
      stepNo={6}
      eyebrow="After the meal"
      title="Turn guests into reviews"
      subtitle="Once seated, happy guests are nudged to leave a Google review — growing your reputation on autopilot."
      view="customer"
      accent={blue}
    >
      <PhoneFrame screenBg="#5a534c" accent={blue}>
        <ReviewScreen tapAt={82} />
        <Tap leftPct={50} topPct={64} tapAt={82} color="rgba(255,255,255,0.9)" />
      </PhoneFrame>
    </Stage>
  );
}

function S7_Outro() {
  const head = useEnter(10, { y: 40 });
  const sub = useEnter(24, { y: 30 });
  return (
    <AbsoluteFill
      style={{
        background: darkBackground,
        fontFamily: fonts.body,
        color: colors.adminText,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <Badge delay={0} size={120} />
      <div style={{ ...head, marginTop: 38, fontFamily: fonts.display, fontWeight: 700, fontSize: 86, lineHeight: 1.05 }}>
        From scan to seated —<br />fully automated.
      </div>
      <div style={{ ...sub, marginTop: 26, fontSize: 32, color: colors.adminMute }}>
        Nahdi Mandi · Queue Management System
      </div>
      <div
        style={{
          ...sub,
          marginTop: 40,
          padding: "18px 40px",
          borderRadius: 999,
          background: `linear-gradient(120deg, ${colors.ember}, ${colors.brass})`,
          color: colors.ink,
          fontSize: 26,
          fontWeight: 700,
        }}
      >
        nahdimandi.web.app
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- Composition ---------------- */
const sceneList = [
  { Comp: S1_Scan, duration: 95 },
  { Comp: S2_Join, duration: 150 },
  { Comp: S3_AdminReady, duration: 130 },
  { Comp: S4_TableReady, duration: 150 },
  { Comp: S5_AdminSeated, duration: 115 },
  { Comp: S6_Review, duration: 135 },
  { Comp: S7_Outro, duration: 115 },
];

export const DURATION_IN_FRAMES =
  sceneList.reduce((s, x) => s + x.duration, 0) - (sceneList.length - 1) * T;

function buildChildren() {
  const out = [];
  sceneList.forEach(({ Comp, duration }, i) => {
    out.push(
      <TransitionSeries.Sequence key={`s-${i}`} durationInFrames={duration}>
        <Comp />
      </TransitionSeries.Sequence>
    );
    if (i < sceneList.length - 1) {
      out.push(
        <TransitionSeries.Transition
          key={`t-${i}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
      );
    }
  });
  return out;
}

export function DemoVideo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f7f0e4" }}>
      <TransitionSeries>{buildChildren()}</TransitionSeries>
    </AbsoluteFill>
  );
}
