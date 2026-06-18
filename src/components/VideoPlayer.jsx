import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Player } from "@remotion/player";

// iOS (incl. iPadOS posing as Mac) cannot put a <div> into native fullscreen,
// so we detect it and use a rotated CSS pseudo-fullscreen overlay instead.
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function ExpandIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M16 21h3a2 2 0 0 0 2-2v-3M8 21H5a2 2 0 0 1-2-2v-3" />
    </svg>
  );
}

export default function VideoPlayer({ onPlay, ...playerProps }) {
  const inlineRef = useRef(null);
  const playerRef = useRef(null);
  const [pseudo, setPseudo] = useState(false);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  // Track viewport while in pseudo-fullscreen so we can re-fit on rotation.
  useEffect(() => {
    if (!pseudo) return undefined;
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setPseudo(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [pseudo]);

  // Release any orientation lock when leaving native fullscreen.
  useEffect(() => {
    const onChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl && window.screen?.orientation?.unlock) {
        try {
          window.screen.orientation.unlock();
        } catch {
          /* not supported */
        }
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      return;
    }
    const el = inlineRef.current;
    const req = el && (el.requestFullscreen || el.webkitRequestFullscreen);
    if (req && !isIOS()) {
      try {
        await req.call(el);
        if (window.screen?.orientation?.lock) {
          window.screen.orientation.lock("landscape").catch(() => {});
        }
        return;
      } catch {
        /* fall through to pseudo-fullscreen */
      }
    }
    setPseudo(true);
  }, []);

  const player = (
    <Player
      ref={playerRef}
      controls
      clickToPlay
      allowFullscreen={false}
      onPlay={onPlay}
      {...playerProps}
      style={{ width: "100%", height: "100%", ...(playerProps.style || {}) }}
    />
  );

  const fsButton = (
    <button
      type="button"
      onClick={toggleFullscreen}
      aria-label="Toggle fullscreen"
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        width: 44,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        border: "none",
        color: "#fff",
        background: "rgba(15,15,18,0.55)",
        backdropFilter: "blur(4px)",
        cursor: "pointer",
        zIndex: 5,
      }}
    >
      <ExpandIcon />
    </button>
  );

  // Pseudo-fullscreen: fit a 16:9 box to the viewport, rotating it 90° on
  // portrait screens so the video fills the phone.
  let overlay = null;
  if (pseudo) {
    const portrait = vp.h >= vp.w;
    let boxStyle;
    if (portrait) {
      const onW = Math.min(vp.w, (vp.h * 9) / 16);
      boxStyle = { width: (onW * 16) / 9, height: onW, transform: "rotate(90deg)", flexShrink: 0 };
    } else {
      const w = Math.min(vp.w, (vp.h * 16) / 9);
      boxStyle = { width: w, height: (w * 9) / 16, flexShrink: 0 };
    }
    overlay = createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483000,
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div style={boxStyle}>{player}</div>
        <button
          type="button"
          onClick={() => setPseudo(false)}
          aria-label="Exit fullscreen"
          style={{
            position: "fixed",
            top: "max(14px, env(safe-area-inset-top))",
            right: 16,
            width: 46,
            height: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            lineHeight: 1,
            borderRadius: 12,
            border: "none",
            color: "#fff",
            background: "rgba(255,255,255,0.18)",
            cursor: "pointer",
            zIndex: 2147483001,
          }}
        >
          ✕
        </button>
      </div>,
      document.body
    );
  }

  return (
    <>
      <div ref={inlineRef} style={{ position: "relative", width: "100%" }}>
        <div style={{ width: "100%", aspectRatio: "16 / 9" }}>{!pseudo && player}</div>
        {fsButton}
      </div>
      {overlay}
    </>
  );
}
