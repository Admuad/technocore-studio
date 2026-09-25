import React from 'react';
import { Sequence } from 'remotion';
import { SceneIntro } from './SceneIntro';
import { SceneSteps } from './SceneSteps';
import { SceneScorecard } from './SceneScorecard';
import { SceneOutro } from './SceneOutro';

export const StudioDemoVideo: React.FC = () => {
  return (
    <>
      {/* Scene 1: Intro (0s - 3s = 90 frames @ 30fps) */}
      <Sequence from={0} durationInFrames={90}>
        <SceneIntro />
      </Sequence>

      {/* Scene 2: 4-Step Breakdown (3s - 7s = 120 frames @ 30fps) */}
      <Sequence from={90} durationInFrames={120}>
        <SceneSteps />
      </Sequence>

      {/* Scene 3: Readiness Scorecard & Roles (7s - 11s = 120 frames @ 30fps) */}
      <Sequence from={210} durationInFrames={120}>
        <SceneScorecard />
      </Sequence>

      {/* Scene 4: Outro & Call to Action (11s - 14s = 90 frames @ 30fps) */}
      <Sequence from={330} durationInFrames={90}>
        <SceneOutro />
      </Sequence>
    </>
  );
};
