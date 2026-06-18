import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  ChallengesScene,
  CompareScene,
  FeaturesScene,
  HeroScene,
  OnboardingScene,
  OutroScene,
  ProblemScene,
  RoiScene,
  SolutionScene,
  TechScene,
} from "./scenes";

export const FPS = 30;
export const TRANSITION = 18;

// Per-scene durations in frames (at 30fps).
const sceneList = [
  { Comp: HeroScene, duration: 120 },
  { Comp: ProblemScene, duration: 135 },
  { Comp: ChallengesScene, duration: 125 },
  { Comp: SolutionScene, duration: 125 },
  { Comp: OnboardingScene, duration: 145 },
  { Comp: FeaturesScene, duration: 125 },
  { Comp: TechScene, duration: 115 },
  { Comp: RoiScene, duration: 150 },
  { Comp: CompareScene, duration: 155 },
  { Comp: OutroScene, duration: 140 },
];

// Total composition length, accounting for overlapping transitions.
export const DURATION_IN_FRAMES =
  sceneList.reduce((sum, s) => sum + s.duration, 0) -
  (sceneList.length - 1) * TRANSITION;

// TransitionSeries expects a flat list of Sequence / Transition children
// (Fragments are not valid direct children), so we build one array.
function buildChildren() {
  const children = [];
  sceneList.forEach(({ Comp, duration }, i) => {
    children.push(
      <TransitionSeries.Sequence key={`seq-${i}`} durationInFrames={duration}>
        <Comp />
      </TransitionSeries.Sequence>
    );
    if (i < sceneList.length - 1) {
      children.push(
        <TransitionSeries.Transition
          key={`trans-${i}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />
      );
    }
  });
  return children;
}

export function PitchVideo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f7f0e4" }}>
      <TransitionSeries>{buildChildren()}</TransitionSeries>
    </AbsoluteFill>
  );
}
