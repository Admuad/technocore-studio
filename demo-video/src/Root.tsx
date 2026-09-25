import React from 'react';
import { Composition } from 'remotion';
import { StudioDemoVideo } from './StudioDemo/StudioDemoVideo';

export const Root: React.FC = () => {
  return (
    <>
      {/* Landscape Full HD (1920x1080) for YouTube / Desktop / X Video */}
      <Composition
        id="TechnocoreStudioDemo"
        component={StudioDemoVideo}
        durationInFrames={420}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Square HD (1080x1080) for X / Twitter Timeline Feed */}
      <Composition
        id="FlopTestnetTeaser"
        component={StudioDemoVideo}
        durationInFrames={420}
        fps={30}
        width={1080}
        height={1080}
      />
    </>
  );
};
