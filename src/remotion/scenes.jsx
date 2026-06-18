import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, warmBackground, darkBackground } from "./theme";
import { Badge, Eyebrow, Scene, useCount, useEnter, useFade } from "./ui";
import { Icon } from "./icons";

/* ---------------------------------------------------------------- */
/* 1. HERO                                                          */
/* ---------------------------------------------------------------- */
export function HeroScene() {
  const title = useEnter(8, { y: 60 });
  const sub = useEnter(22, { y: 40 });
  const pill = useEnter(40, { y: 30 });
  const contact = useFade(56, 16);
  return (
    <Scene
      background={warmBackground}
      style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}
    >
      <Badge delay={0} size={150} />
      <div
        style={{
          ...title,
          marginTop: 44,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 118,
          lineHeight: 1.02,
          color: colors.ink,
          letterSpacing: -2,
        }}
      >
        Nahdi Mandi
      </div>
      <div
        style={{
          ...sub,
          marginTop: 8,
          fontFamily: fonts.mono,
          fontWeight: 500,
          fontSize: 40,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: colors.ember,
        }}
      >
        Queue Management System
      </div>
      <div
        style={{
          ...sub,
          marginTop: 30,
          fontSize: 30,
          color: colors.clove,
          maxWidth: 1100,
          opacity: sub.opacity * 0.85,
        }}
      >
        Reduce waiting-time chaos. Improve customer experience. Save staff costs.
      </div>
      <div
        style={{
          ...pill,
          marginTop: 50,
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          padding: "20px 38px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(124,52,18,0.18)",
          boxShadow: "0 22px 70px rgba(181,90,29,0.18)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ fontSize: 26, color: colors.sage, fontWeight: 600 }}>
          Estimated Annual Staff Cost Saving
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 38,
            color: colors.ember,
          }}
        >
          ₹180,000+
        </span>
      </div>
      <div
        style={{
          opacity: contact,
          marginTop: 38,
          fontFamily: fonts.mono,
          fontSize: 22,
          color: colors.ink,
          letterSpacing: 1,
        }}
      >
        Prepared by Musthafa Abdul Kadar · +91 82818 51272
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- */
/* 2. CURRENT SITUATION                                             */
/* ---------------------------------------------------------------- */
const flowSteps = [
  "Customer Arrives",
  "Employee Records Name",
  "WhatsApp Queue",
  "Table Available",
  "Employee Calls",
  "Customer Seated",
];

export function ProblemScene() {
  const head = useEnter(4, { y: 30 });
  return (
    <Scene background={warmBackground}>
      <Eyebrow delay={0}>The Current Situation</Eyebrow>
      <div
        style={{
          ...head,
          marginTop: 26,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 70,
          lineHeight: 1.05,
          maxWidth: 1400,
        }}
      >
        Today the queue is run manually — over WhatsApp, by two staff.
      </div>

      <div style={{ display: "flex", gap: 40, marginTop: 60 }}>
        {[
          {
            name: "Employee 1",
            items: ["Collecting names", "Recording details", "Maintaining the list", "Managing order"],
          },
          {
            name: "Employee 2",
            items: ["Monitoring tables", "Calling customers", "Managing movement", "Seating guests"],
          },
        ].map((emp, i) => {
          const card = useEnter(16 + i * 8, { y: 40 });
          return (
            <div
              key={emp.name}
              style={{
                ...card,
                flex: 1,
                padding: "36px 40px",
                borderRadius: 28,
                background: "rgba(255,255,255,0.68)",
                border: "1px solid rgba(124,52,18,0.14)",
                boxShadow: "0 26px 80px rgba(31,19,13,0.10)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontFamily: fonts.display,
                  fontSize: 38,
                  fontWeight: 700,
                  color: colors.clove,
                }}
              >
                <span
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: colors.sand,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={i === 0 ? "clipboard" : "phone"} size={28} color={colors.clove} />
                </span>
                {emp.name}
              </div>
              <div style={{ marginTop: 24, display: "grid", gap: 14 }}>
                {emp.items.map((it) => (
                  <div key={it} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 27 }}>
                    <span style={{ color: colors.ember, fontSize: 22 }}>●</span>
                    {it}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <FlowRow steps={flowSteps} startDelay={34} />
    </Scene>
  );
}

function FlowRow({ steps, startDelay, dark = false }) {
  return (
    <div
      style={{
        marginTop: 56,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {steps.map((step, i) => {
        const enter = useEnter(startDelay + i * 6, { y: 18 });
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                ...enter,
                padding: "16px 24px",
                borderRadius: 16,
                fontSize: 24,
                fontWeight: 600,
                fontFamily: fonts.mono,
                background: dark ? "rgba(82,199,234,0.12)" : "rgba(181,90,29,0.10)",
                border: `1px solid ${dark ? "rgba(82,199,234,0.4)" : "rgba(181,90,29,0.28)"}`,
                color: dark ? colors.adminText : colors.clove,
              }}
            >
              {step}
            </div>
            {i < steps.length - 1 && (
              <span style={{ ...enter, fontSize: 28, color: dark ? colors.adminCyan : colors.ember }}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 3. CHALLENGES                                                    */
/* ---------------------------------------------------------------- */
const challenges = [
  { icon: "users", title: "High Staff Dependency", body: "Two employees pulled away from serving guests." },
  { icon: "cost", title: "Increased Labor Cost", body: "₹30,000 / month spent on queue handling alone." },
  { icon: "eye", title: "Limited Visibility", body: "No data on peak hours, volume or performance." },
  { icon: "alert", title: "Human Errors", body: "Missed customers, wrong order, delayed alerts." },
  { icon: "frown", title: "Customer Frustration", body: '"How many ahead?" · "How long?" · "Is it my turn?"' },
];

export function ChallengesScene() {
  const head = useEnter(4, { y: 30 });
  return (
    <Scene background={warmBackground}>
      <Eyebrow delay={0}>Challenges With The Current Process</Eyebrow>
      <div
        style={{
          ...head,
          marginTop: 26,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 72,
        }}
      >
        Functional, but full of friction.
      </div>
      <div
        style={{
          marginTop: 56,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 28,
        }}
      >
        {challenges.map((c, i) => {
          const card = useEnter(16 + i * 7, { y: 46 });
          return (
            <div
              key={c.title}
              style={{
                ...card,
                padding: "34px 34px",
                borderRadius: 26,
                background: "rgba(255,255,255,0.66)",
                border: "1px solid rgba(124,52,18,0.14)",
                boxShadow: "0 22px 60px rgba(31,19,13,0.08)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: "rgba(181,90,29,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={c.icon} size={34} color={colors.ember} />
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontFamily: fonts.display,
                  fontSize: 34,
                  fontWeight: 700,
                  color: colors.clove,
                }}
              >
                {c.title}
              </div>
              <div style={{ marginTop: 12, fontSize: 25, lineHeight: 1.4, color: colors.ink }}>
                {c.body}
              </div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- */
/* 4. SOLUTION                                                      */
/* ---------------------------------------------------------------- */
export function SolutionScene() {
  const head = useEnter(6, { y: 40 });
  const groups = [
    {
      label: "Customer Features",
      accent: colors.ember,
      items: ["Join the queue digitally", "View live queue status", "Automated notifications", "Track progress in real time"],
    },
    {
      label: "Staff & Admin Features",
      accent: colors.sage,
      items: ["Central management dashboard", "Mark tables ready instantly", "View customer history", "Analytics & volume trends"],
    },
  ];
  return (
    <Scene background={warmBackground}>
      <Eyebrow delay={0}>The Proposed Solution</Eyebrow>
      <div
        style={{
          ...head,
          marginTop: 26,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 76,
          lineHeight: 1.04,
          maxWidth: 1450,
        }}
      >
        A cloud-based Queue System that digitizes the entire wait.
      </div>
      <div style={{ display: "flex", gap: 40, marginTop: 64 }}>
        {groups.map((g, gi) => (
          <div
            key={g.label}
            style={{
              ...useEnter(20 + gi * 10, { y: 50 }),
              flex: 1,
              padding: "40px 44px",
              borderRadius: 30,
              background: "rgba(255,255,255,0.7)",
              border: `1px solid ${g.accent}33`,
              boxShadow: "0 26px 80px rgba(31,19,13,0.10)",
            }}
          >
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 24,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: g.accent,
                fontWeight: 600,
              }}
            >
              {g.label}
            </div>
            <div style={{ marginTop: 26, display: "grid", gap: 20 }}>
              {g.items.map((it, ii) => {
                const row = useFade(30 + gi * 10 + ii * 5, 10);
                return (
                  <div
                    key={it}
                    style={{ opacity: row, display: "flex", alignItems: "center", gap: 18, fontSize: 31 }}
                  >
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: `${g.accent}1f`,
                        color: g.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                    {it}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- */
/* 5. QR / HYBRID ONBOARDING                                        */
/* ---------------------------------------------------------------- */
export function OnboardingScene() {
  const head = useEnter(4, { y: 30 });
  const qr = useEnter(18, { y: 0, damping: 13 });
  return (
    <Scene background={warmBackground}>
      <Eyebrow delay={0}>Flexible Queue Entry</Eyebrow>
      <div
        style={{
          ...head,
          marginTop: 24,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 70,
        }}
      >
        Two ways in — used together as a hybrid model.
      </div>

      <div style={{ display: "flex", gap: 48, marginTop: 54, alignItems: "stretch" }}>
        {/* QR self check-in */}
        <div
          style={{
            ...useEnter(14, { y: 44 }),
            flex: 1.2,
            padding: "38px 42px",
            borderRadius: 30,
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(124,52,18,0.14)",
            boxShadow: "0 26px 80px rgba(31,19,13,0.10)",
            display: "flex",
            gap: 36,
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...qr,
              width: 180,
              height: 180,
              borderRadius: 24,
              background: colors.white,
              border: `3px solid ${colors.ember}`,
              padding: 12,
              flexShrink: 0,
            }}
          >
            <Img
              src={staticFile("qr-nahdimandi.png")}
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 6 }}
            />
          </div>
          <div>
            <div style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: 3, color: colors.ember, fontWeight: 600 }}>
              OPTION 1
            </div>
            <div style={{ fontFamily: fonts.display, fontSize: 40, fontWeight: 700, color: colors.clove, marginTop: 6 }}>
              Self Check-In via QR
            </div>
            <div style={{ marginTop: 14, fontSize: 26, lineHeight: 1.4 }}>
              Scan → open website → enter details → join queue. No staff involvement, faster onboarding.
            </div>
          </div>
        </div>

        {/* Admin assisted */}
        <div
          style={{
            ...useEnter(24, { y: 44 }),
            flex: 1,
            padding: "38px 42px",
            borderRadius: 30,
            background: "rgba(67,82,71,0.08)",
            border: `1px solid ${colors.sage}33`,
            boxShadow: "0 26px 80px rgba(31,19,13,0.08)",
          }}
        >
          <div style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: 3, color: colors.sage, fontWeight: 600 }}>
            OPTION 2
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 40, fontWeight: 700, color: colors.sage, marginTop: 6 }}>
            Admin-Assisted Entry
          </div>
          <div style={{ marginTop: 14, fontSize: 26, lineHeight: 1.4 }}>
            Staff add guests from the dashboard — perfect for non-smartphone customers and busy peaks.
          </div>
        </div>
      </div>

      {/* Hybrid banner */}
      <div
        style={{
          ...useEnter(40, { y: 30 }),
          marginTop: 44,
          padding: "26px 40px",
          borderRadius: 22,
          background: `linear-gradient(120deg, ${colors.ember}, ${colors.clove})`,
          color: colors.white,
          display: "flex",
          alignItems: "center",
          gap: 22,
          boxShadow: "0 24px 60px rgba(181,90,29,0.32)",
        }}
      >
        <Icon name="star" size={36} color={colors.white} fill={colors.white} strokeWidth={1} />
        <span style={{ fontSize: 30, fontWeight: 600 }}>
          Recommended: the Hybrid Model — QR self-service in normal hours, staff assist at peak.
        </span>
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- */
/* 6. SYSTEM CAPABILITIES                                           */
/* ---------------------------------------------------------------- */
const capabilities = [
  { icon: "bolt", title: "Online Registration", body: "Join in seconds — name, phone, party size." },
  { icon: "pin", title: "Live Queue Tracking", body: "Queue number, position & live progress." },
  { icon: "bell", title: "Real-Time Alerts", body: "Instant notice the moment a table is ready." },
  { icon: "monitor", title: "Real-Time Dashboard", body: "Every waiting customer, visible instantly." },
  { icon: "cursor", title: "One-Click Actions", body: "Waiting → Table Ready → Seated → Done." },
  { icon: "chart", title: "Analytics Engine", body: "Peak hours, peak days & volume trends." },
];

export function FeaturesScene() {
  const head = useEnter(4, { y: 30 });
  return (
    <Scene background={warmBackground}>
      <Eyebrow delay={0}>System Capabilities</Eyebrow>
      <div
        style={{
          ...head,
          marginTop: 24,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 72,
        }}
      >
        Everything the floor needs, in one place.
      </div>
      <div
        style={{
          marginTop: 52,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 28,
        }}
      >
        {capabilities.map((c, i) => {
          const card = useEnter(14 + i * 6, { y: 46 });
          return (
            <div
              key={c.title}
              style={{
                ...card,
                padding: "32px 34px",
                borderRadius: 26,
                background: "rgba(255,255,255,0.68)",
                border: "1px solid rgba(124,52,18,0.14)",
                boxShadow: "0 20px 56px rgba(31,19,13,0.08)",
                display: "flex",
                gap: 22,
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  background: "rgba(181,90,29,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={c.icon} size={30} color={colors.ember} />
              </span>
              <div>
                <div style={{ fontFamily: fonts.display, fontSize: 31, fontWeight: 700, color: colors.clove }}>
                  {c.title}
                </div>
                <div style={{ marginTop: 8, fontSize: 24, lineHeight: 1.4 }}>{c.body}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- */
/* 7. TECH PLATFORM                                                 */
/* ---------------------------------------------------------------- */
const stack = [
  { label: "Frontend", value: "React" },
  { label: "Auth", value: "Firebase Auth" },
  { label: "Database", value: "Firestore" },
  { label: "Alerts", value: "Browser Alerts" },
];
const infraBenefits = ["Real-Time", "Highly Reliable", "Secure", "Scalable", "Low Maintenance"];

export function TechScene() {
  const head = useEnter(6, { y: 36 });
  return (
    <Scene background={darkBackground} style={{ color: colors.adminText }}>
      <Eyebrow delay={0} dark>
        Modern Technology Platform
      </Eyebrow>
      <div
        style={{
          ...head,
          marginTop: 26,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 74,
          color: colors.adminText,
        }}
      >
        Built on scalable cloud infrastructure.
      </div>
      <div style={{ display: "flex", gap: 28, marginTop: 60 }}>
        {stack.map((s, i) => {
          const card = useEnter(18 + i * 8, { y: 44 });
          return (
            <div
              key={s.label}
              style={{
                ...card,
                flex: 1,
                padding: "38px 30px",
                borderRadius: 24,
                background: "rgba(28,39,51,0.7)",
                border: `1px solid ${colors.adminLine}`,
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: 3, color: colors.adminMute, textTransform: "uppercase" }}>
                {s.label}
              </div>
              <div style={{ marginTop: 14, fontFamily: fonts.display, fontSize: 42, fontWeight: 700, color: colors.adminCyan }}>
                {s.value}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 56, display: "flex", flexWrap: "wrap", gap: 18 }}>
        {infraBenefits.map((b, i) => {
          const pill = useEnter(46 + i * 5, { y: 24 });
          return (
            <div
              key={b}
              style={{
                ...pill,
                padding: "16px 30px",
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 600,
                color: colors.adminMint,
                background: "rgba(126,213,168,0.10)",
                border: `1px solid ${colors.adminMint}44`,
              }}
            >
              {b}
            </div>
          );
        })}
      </div>
    </Scene>
  );
}

/* ---------------------------------------------------------------- */
/* 8. COST SAVING / ROI                                             */
/* ---------------------------------------------------------------- */
export function RoiScene() {
  const head = useEnter(4, { y: 30 });
  const current = useCount(30000, 24, 36);
  const future = useCount(15000, 24, 36);
  const yearly = useCount(180000, 40, 46);
  const fmt = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  return (
    <Scene background={warmBackground}>
      <Eyebrow delay={0}>Cost Saving & ROI</Eyebrow>
      <div
        style={{
          ...head,
          marginTop: 24,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 72,
        }}
      >
        One employee freed. Real money saved.
      </div>

      <div style={{ display: "flex", gap: 36, marginTop: 56, alignItems: "stretch" }}>
        <CostCard
          label="Current Staffing"
          delay={16}
          value={fmt(current)}
          per="/ month · 2 employees"
          tone={colors.clove}
          bg="rgba(124,52,18,0.08)"
        />
        <div
          style={{
            ...useEnter(28, { y: 0 }),
            display: "flex",
            alignItems: "center",
            fontSize: 60,
            color: colors.ember,
          }}
        >
          →
        </div>
        <CostCard
          label="After Implementation"
          delay={28}
          value={fmt(future)}
          per="/ month · 1 employee"
          tone={colors.sage}
          bg="rgba(67,82,71,0.10)"
        />
      </div>

      <div
        style={{
          ...useEnter(44, { y: 40 }),
          marginTop: 44,
          padding: "34px 48px",
          borderRadius: 26,
          background: `linear-gradient(120deg, ${colors.ember}, ${colors.clove})`,
          color: colors.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 26px 70px rgba(181,90,29,0.34)",
        }}
      >
        <span style={{ fontSize: 34, fontWeight: 600 }}>Estimated Yearly Saving</span>
        <span style={{ fontFamily: fonts.display, fontSize: 76, fontWeight: 700 }}>{fmt(yearly)}+</span>
      </div>
    </Scene>
  );
}

function CostCard({ label, value, per, tone, bg, delay }) {
  const card = useEnter(delay, { y: 44 });
  return (
    <div
      style={{
        ...card,
        flex: 1,
        padding: "40px 44px",
        borderRadius: 28,
        background: bg,
        border: `1px solid ${tone}33`,
      }}
    >
      <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: tone, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ marginTop: 18, fontFamily: fonts.display, fontSize: 90, fontWeight: 700, color: tone }}>
        {value}
      </div>
      <div style={{ marginTop: 6, fontSize: 27, color: colors.ink, opacity: 0.7 }}>{per}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 9. BEFORE vs AFTER                                               */
/* ---------------------------------------------------------------- */
const comparison = [
  ["Manual queue management", "Automated queue management"],
  ["WhatsApp tracking", "Dedicated live dashboard"],
  ["Two employees required", "One employee required"],
  ["Manual customer calling", "Automatic digital alerts"],
  ["No performance analytics", "Full analytics & insights"],
  ["Customer uncertainty", "Real-time progress visibility"],
];

export function CompareScene() {
  const head = useEnter(4, { y: 30 });
  return (
    <Scene background={warmBackground}>
      <Eyebrow delay={0}>Before vs After</Eyebrow>
      <div
        style={{
          ...head,
          marginTop: 22,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 70,
        }}
      >
        The shift, line by line.
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 30, marginBottom: 18 }}>
        <ColHead text="Current Process" tone={colors.clove} flex={1} delay={10} />
        <div style={{ width: 60 }} />
        <ColHead text="Proposed System" tone={colors.ember} flex={1} delay={14} />
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {comparison.map((row, i) => {
          const enter = useEnter(20 + i * 6, { y: 28 });
          return (
            <div key={i} style={{ ...enter, display: "flex", gap: 24, alignItems: "center" }}>
              <div
                style={{
                  flex: 1,
                  padding: "20px 30px",
                  borderRadius: 18,
                  background: "rgba(124,52,18,0.07)",
                  border: "1px solid rgba(124,52,18,0.16)",
                  fontSize: 28,
                  color: colors.clove,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span style={{ opacity: 0.5 }}>✕</span>
                {row[0]}
              </div>
              <span style={{ width: 60, textAlign: "center", fontSize: 32, color: colors.ember }}>→</span>
              <div
                style={{
                  flex: 1,
                  padding: "20px 30px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.72)",
                  border: `1px solid ${colors.ember}3a`,
                  fontSize: 28,
                  fontWeight: 600,
                  color: colors.ink,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span style={{ color: colors.sage }}>✓</span>
                {row[1]}
              </div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}

function ColHead({ text, tone, flex, delay }) {
  const enter = useEnter(delay, { y: 20 });
  return (
    <div
      style={{
        ...enter,
        flex,
        fontFamily: fonts.mono,
        fontSize: 24,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: tone,
        fontWeight: 600,
        paddingLeft: 30,
      }}
    >
      {text}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 10. OUTRO / CTA                                                  */
/* ---------------------------------------------------------------- */
export function OutroScene() {
  const head = useEnter(10, { y: 50 });
  const sub = useEnter(24, { y: 36 });
  const cta = useEnter(40, { y: 30 });
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const glow = interpolate(
    frame,
    [0, durationInFrames / 2, durationInFrames],
    [0.2, 0.5, 0.2]
  );
  return (
    <Scene
      background={darkBackground}
      style={{ justifyContent: "center", alignItems: "center", textAlign: "center", color: colors.adminText }}
    >
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(181,90,29,${glow}), transparent 60%)`,
          filter: "blur(40px)",
        }}
      />
      <Badge delay={0} size={120} />
      <div
        style={{
          ...head,
          marginTop: 40,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 92,
          lineHeight: 1.04,
          maxWidth: 1500,
          color: colors.adminText,
        }}
      >
        Ready to modernize the waiting experience?
      </div>
      <div
        style={{
          ...sub,
          marginTop: 28,
          fontSize: 32,
          color: colors.adminMute,
          maxWidth: 1200,
        }}
      >
        Reduce costs. Improve satisfaction. Create a smarter restaurant.
      </div>
      <div
        style={{
          ...cta,
          marginTop: 50,
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            padding: "22px 44px",
            borderRadius: 999,
            background: `linear-gradient(120deg, ${colors.ember}, ${colors.brass})`,
            color: colors.ink,
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          Save ₹180,000+ / year
        </div>
        <div style={{ fontFamily: fonts.mono, fontSize: 26, color: colors.adminText, letterSpacing: 1 }}>
          +91 82818 51272
        </div>
      </div>
      <div style={{ ...cta, marginTop: 24, fontFamily: fonts.mono, fontSize: 22, color: colors.adminMute }}>
        musthafa-portfolio.web.app
      </div>
    </Scene>
  );
}
