import { useRef, useState } from "react";
import { Player } from "@remotion/player";
import { DemoVideo, FPS, DURATION_IN_FRAMES } from "../remotion/demo/DemoVideo";

export default function DemoPage() {
  const playerRef = useRef(null);
  const [showHint, setShowHint] = useState(true);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className="mb-6 text-center">
          <p className="font-admin text-xs uppercase tracking-[0.4em] text-ember">
            Product Demo
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
            Nahdi Mandi · From scan to seated
          </h1>
          <p className="mt-2 text-sm text-clove/80">
            A walkthrough of the full customer and staff queue flow.
          </p>
        </div>

        <div className="glass-panel overflow-hidden p-3 sm:p-4">
          <div className="overflow-hidden rounded-[1.4rem] shadow-glow">
            <Player
              ref={playerRef}
              component={DemoVideo}
              durationInFrames={DURATION_IN_FRAMES}
              fps={FPS}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{ width: "100%", aspectRatio: "16 / 9" }}
              controls
              autoPlay
              loop
              clickToPlay
              doubleClickToFullscreen
              onPlay={() => setShowHint(false)}
            />
          </div>
        </div>

        {showHint && (
          <p className="mt-4 text-center text-xs text-clove/70">
            Tap the video to play · double-click for fullscreen
          </p>
        )}
      </div>
    </div>
  );
}
