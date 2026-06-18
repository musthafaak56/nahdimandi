import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { green, blue, Pill } from "./kit";

const Screen = ({ bg, children }) => (
  <div style={{ position: "absolute", inset: 0, background: bg, padding: "62px 24px 24px", overflow: "hidden" }}>
    {children}
  </div>
);

/* ============================================================ */
/* QR SCAN                                                      */
/* ============================================================ */
export function QRScreen() {
  const frame = useCurrentFrame();
  const scan = interpolate(frame % 75, [0, 75], [0, 1]);
  return (
    <Screen bg="linear-gradient(160deg,#fbf4e8,#efe1cb)">
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 16, letterSpacing: 4, color: colors.ember, fontWeight: 600 }}>
          NAHDI MANDI
        </div>
        <div style={{ fontFamily: fonts.display, fontSize: 30, fontWeight: 700, color: colors.ink, marginTop: 8 }}>
          Scan to join
        </div>
      </div>
      <div
        style={{
          margin: "48px auto 0",
          width: 250,
          height: 250,
          borderRadius: 28,
          background: "#fff",
          border: `4px solid ${colors.ember}`,
          padding: 18,
          position: "relative",
          boxShadow: "0 30px 60px rgba(181,90,29,0.2)",
        }}
      >
        <Img
          src={staticFile("qr-nahdimandi.png")}
          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 6 }}
        />
        {/* scan line */}
        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: `${14 + scan * 222}px`,
            height: 4,
            borderRadius: 4,
            background: colors.ember,
            boxShadow: `0 0 16px ${colors.ember}`,
          }}
        />
      </div>
      <div style={{ textAlign: "center", marginTop: 44, fontSize: 19, color: colors.clove, lineHeight: 1.5 }}>
        Point your camera at the QR code<br />at the entrance or your table.
      </div>
    </Screen>
  );
}

/* ============================================================ */
/* JOIN PAGE                                                    */
/* ============================================================ */
export function JoinScreen() {
  const frame = useCurrentFrame();
  const name = "Amina".slice(0, Math.round(interpolate(frame, [14, 44], [0, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const caret = frame % 16 < 8 && frame < 50;
  const joined = frame > 112;
  const toast = interpolate(frame, [112, 126], [120, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const label = { fontSize: 16, color: colors.ink, fontWeight: 600, marginBottom: 8 };
  const field = {
    width: "100%",
    borderRadius: 16,
    border: "1px solid rgba(124,52,18,0.16)",
    background: "rgba(255,255,255,0.85)",
    padding: "14px 16px",
    fontSize: 18,
    color: colors.ink,
    minHeight: 50,
  };

  return (
    <Screen bg="#f7f0e4">
      <div style={{ fontFamily: fonts.display, fontSize: 25, fontWeight: 700, color: colors.ink, lineHeight: 1.1 }}>
        Join the queue in under a minute.
      </div>

      {/* location card */}
      <div style={{ marginTop: 16, borderRadius: 18, background: "rgba(234,160,90,0.18)", border: "1px solid rgba(181,90,29,0.22)", padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: colors.clove }}>Step 1 of 2 · allow location access</div>
        <div style={{ fontSize: 13, color: colors.clove, marginTop: 6, lineHeight: 1.4, opacity: 0.85 }}>
          We verify you are within 2.5 km of Nahdi Mandi before joining.
        </div>
        <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 999, padding: "10px 18px", fontSize: 15, fontWeight: 700, color: colors.clove }}>
          <span style={{ color: green.mid }}>✓</span> Location access granted
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={label}>Guest name</div>
        <div style={field}>
          {name ? (
            <span>{name}{caret ? "|" : ""}</span>
          ) : (
            <span style={{ color: "rgba(31,19,13,0.35)" }}>Amina</span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={label}>Phone number</div>
        <div style={field}>8281851282</div>
      </div>

      <div style={{ marginTop: 14, borderRadius: 18, border: "1px solid rgba(124,52,18,0.14)", background: "rgba(255,255,255,0.6)", padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink }}>Party size</div>
          <div style={{ fontSize: 12, color: colors.clove, opacity: 0.7 }}>1 to 20 guests</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Round>−</Round>
          <span style={{ fontSize: 24, fontWeight: 700, color: colors.ink, minWidth: 24, textAlign: "center" }}>2</span>
          <Round>+</Round>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          width: "100%",
          borderRadius: 999,
          background: joined ? green.mid : colors.ember,
          color: "#fff",
          textAlign: "center",
          padding: "16px 0",
          fontSize: 20,
          fontWeight: 700,
          transition: "none",
        }}
      >
        {joined ? "✓ You're in the queue" : "Join the queue"}
      </div>

      {/* success toast */}
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          bottom: 26,
          transform: `translateY(${toast}px)`,
          opacity: interpolate(frame, [112, 124], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          background: colors.ink,
          color: "#fff",
          borderRadius: 16,
          padding: "14px 18px",
          fontSize: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>You're queued · position</span>
        <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.brass }}>#3</span>
      </div>
    </Screen>
  );
}
const Round = ({ children }) => (
  <span style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(124,52,18,0.2)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: colors.ember }}>
    {children}
  </span>
);

/* ============================================================ */
/* ADMIN DASHBOARD                                              */
/* mode: "ready" (waiting -> notified) | "seated" (notified -> seated) */
/* ============================================================ */
export function AdminScreen({ mode = "ready", tapAt = 70 }) {
  const frame = useCurrentFrame();
  const acted = frame >= tapAt + 6;

  let status, statusColor;
  if (mode === "ready") {
    status = acted ? "NOTIFIED" : "WAITING";
    statusColor = acted ? colors.adminMint : colors.adminAmber || "#f2b45a";
  } else {
    status = acted ? "SEATED" : "NOTIFIED";
    statusColor = acted ? colors.adminCyan : colors.adminMint;
  }
  const cardFade = mode === "seated" ? interpolate(frame, [tapAt + 14, tapAt + 40], [1, 0.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const showTimer = (mode === "ready" && acted) || mode === "seated";

  const tab = (t, active) => (
    <div style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 600, letterSpacing: 1, color: active ? colors.adminCyan : colors.adminMute, borderBottom: active ? `2px solid ${colors.adminCyan}` : "2px solid transparent", paddingBottom: 8 }}>
      {t}
    </div>
  );

  return (
    <Screen bg="#101820">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 15, color: colors.adminMute, letterSpacing: 2 }}>ADMIN · LIVE</div>
        <div style={{ padding: "6px 14px", borderRadius: 999, background: "#fff", color: colors.adminBase, fontSize: 13, fontWeight: 600 }}>Sign out</div>
      </div>
      <div style={{ display: "flex", gap: 22, marginTop: 18, borderBottom: `1px solid ${colors.adminLine}` }}>
        {tab("LIVE QUEUE", true)}
        {tab("HISTORY", false)}
        {tab("CONTACT", false)}
      </div>

      {/* queue card */}
      <div
        style={{
          marginTop: 22,
          opacity: cardFade,
          borderRadius: 22,
          border: `1px solid ${colors.adminLine}`,
          background: colors.adminSlate,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <Pill color={colors.adminCyan} bg="rgba(82,199,234,0.12)" border="rgba(82,199,234,0.4)">QUEUE #3</Pill>
          <Pill color={colors.adminMute} bg="rgba(147,168,189,0.1)" border={colors.adminLine}>ID #3</Pill>
          <Pill color={statusColor} bg={`${statusColor}1f`} border={`${statusColor}66`}>{status}</Pill>
        </div>
        <div style={{ fontFamily: fonts.mono, fontSize: 32, fontWeight: 700, color: colors.adminText, marginTop: 16 }}>Amina</div>
        <div style={{ fontSize: 16, color: colors.adminMute, marginTop: 8 }}>8281851282 · 2 guests · joined 1 min ago</div>
        {showTimer && (
          <div style={{ fontSize: 17, marginTop: 10, color: "#f2b45a", fontWeight: 600 }}>
            Timer: 30s · table-ready sent
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <AdminBtn color={colors.adminMute} bg="rgba(147,168,189,0.12)">Call</AdminBtn>
          {mode === "ready" ? (
            <AdminBtn color={colors.adminMint} bg="rgba(126,213,168,0.14)" highlight={!acted}>
              {acted ? "Table ready sent" : "Table Ready"}
            </AdminBtn>
          ) : (
            <AdminBtn color={colors.adminMint} bg="rgba(126,213,168,0.1)">Table ready sent</AdminBtn>
          )}
          <AdminBtn color={colors.adminCyan} bg="rgba(82,199,234,0.14)" highlight={mode === "seated" && !acted}>
            {mode === "seated" && acted ? "✓ Seated" : "Seated"}
          </AdminBtn>
        </div>
      </div>

      {/* a second faded card for context */}
      <div style={{ marginTop: 16, borderRadius: 22, border: `1px solid ${colors.adminLine}`, background: "rgba(28,39,51,0.5)", padding: 20, opacity: 0.55 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Pill color={colors.adminCyan} bg="rgba(82,199,234,0.1)" border="rgba(82,199,234,0.3)">QUEUE #4</Pill>
          <Pill color="#f2b45a" bg="rgba(242,180,90,0.12)" border="rgba(242,180,90,0.4)">WAITING</Pill>
        </div>
        <div style={{ fontFamily: fonts.mono, fontSize: 26, fontWeight: 700, color: colors.adminText, marginTop: 12 }}>Ahyan</div>
        <div style={{ fontSize: 15, color: colors.adminMute, marginTop: 6 }}>8 guests · joined just now</div>
      </div>
    </Screen>
  );
}
function AdminBtn({ children, color, bg, highlight }) {
  const frame = useCurrentFrame();
  const pulse = highlight ? 0.5 + 0.5 * Math.abs(Math.sin(frame / 9)) : 1;
  return (
    <span
      style={{
        padding: "11px 18px",
        borderRadius: 999,
        fontSize: 16,
        fontWeight: 600,
        color,
        background: bg,
        border: `1px solid ${color}${highlight ? "" : "55"}`,
        boxShadow: highlight ? `0 0 ${10 + pulse * 16}px ${color}` : "none",
      }}
    >
      {children}
    </span>
  );
}

/* ============================================================ */
/* TABLE READY (customer) with 30s countdown                   */
/* ============================================================ */
export function TableReadyScreen({ startSeconds = 30 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.floor(frame / fps);
  const seconds = Math.max(0, startSeconds - elapsed);
  const ringPulse = 1 + Math.sin(frame / 8) * 0.04;
  return (
    <Screen bg={green.pale}>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            margin: "0 auto",
            background: green.soft,
            border: `2px solid ${green.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            color: green.mid,
            transform: `scale(${ringPulse})`,
          }}
        >
          ✓
        </div>
        <div style={{ fontFamily: fonts.mono, fontSize: 18, letterSpacing: 5, color: green.mid, fontWeight: 700, marginTop: 22 }}>
          TABLE READY
        </div>
        <div style={{ fontFamily: fonts.display, fontSize: 42, fontWeight: 700, color: colors.ink, marginTop: 10, lineHeight: 1.05 }}>
          Your table<br />is ready.
        </div>
        <div style={{ fontSize: 18, color: colors.ink, opacity: 0.7, marginTop: 14 }}>
          Please come to the front desk now.
        </div>
      </div>

      {/* countdown */}
      <div
        style={{
          margin: "26px auto 0",
          width: 250,
          borderRadius: 26,
          background: green.soft,
          border: `1px solid ${green.line}`,
          padding: "22px 0",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 16, color: green.ink, fontWeight: 600, letterSpacing: 1 }}>
          Head to the desk within
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontFamily: fonts.display, fontSize: 88, fontWeight: 700, color: green.ink, lineHeight: 1 }}>
            {seconds}
          </span>
          <span style={{ fontSize: 28, fontWeight: 700, color: green.mid }}>s</span>
        </div>
        <div style={{ fontSize: 15, color: green.ink, opacity: 0.75, marginTop: 4 }}>to keep your spot</div>
      </div>

      <div style={{ margin: "22px auto 0", width: 280, borderRadius: 18, background: green.soft, border: `1px solid ${green.line}`, padding: "14px 18px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>Automatic live location check</div>
        <div style={{ fontSize: 14, color: green.ink, marginTop: 6, lineHeight: 1.4 }}>
          Location confirmed · about 7 m away, inside the arrival zone.
        </div>
      </div>
    </Screen>
  );
}

/* ============================================================ */
/* GOOGLE REVIEW (customer)                                     */
/* ============================================================ */
export function ReviewScreen({ tapAt = 80 }) {
  const frame = useCurrentFrame();
  const pressed = frame >= tapAt && frame < tapAt + 10;
  const opening = frame >= tapAt + 14;
  return (
    <Screen bg="linear-gradient(160deg,#6f675f,#4f4944)">
      <div
        style={{
          marginTop: 60,
          borderRadius: 30,
          background: "rgba(244,240,235,0.96)",
          border: `1.5px solid ${blue}`,
          padding: "30px 26px",
          boxShadow: "0 30px 70px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ width: 86, height: 86, borderRadius: "50%", margin: "0 auto", background: "#cfe0ef", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, color: blue }}>
          ★
        </div>
        <div style={{ textAlign: "center", fontFamily: fonts.mono, fontSize: 16, letterSpacing: 4, color: blue, fontWeight: 700, marginTop: 20 }}>
          THANKS FOR DINING WITH US
        </div>
        <div style={{ textAlign: "center", fontFamily: fonts.display, fontSize: 36, fontWeight: 700, color: colors.ink, marginTop: 12, lineHeight: 1.08 }}>
          Would you leave a quick review?
        </div>
        <div style={{ textAlign: "center", fontSize: 17, color: colors.ink, opacity: 0.65, marginTop: 14, lineHeight: 1.45 }}>
          Your feedback helps other guests find us and helps the restaurant improve.
        </div>
        <div
          style={{
            marginTop: 26,
            width: "100%",
            borderRadius: 999,
            background: colors.ember,
            color: "#fff",
            textAlign: "center",
            padding: "16px 0",
            fontSize: 19,
            fontWeight: 700,
            transform: `scale(${pressed ? 0.96 : 1})`,
            boxShadow: opening ? `0 0 40px ${colors.ember}` : "none",
          }}
        >
          {opening ? "Opening Google…" : "Leave a Google review"}
        </div>
        <div style={{ marginTop: 12, width: "100%", borderRadius: 999, background: "#efe9e1", color: colors.clove, textAlign: "center", padding: "14px 0", fontSize: 18, fontWeight: 600 }}>
          Maybe later
        </div>
      </div>
    </Screen>
  );
}
