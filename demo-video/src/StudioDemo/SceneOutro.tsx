import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#FFF2E1',
      }}
    >
      <div
        style={{
          transform: `scale(${spr})`,
          opacity: spr,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: '#A79277',
            color: '#1C1917',
            padding: '8px 24px',
            borderRadius: '9999px',
            fontSize: '18px',
            fontWeight: 800,
            marginBottom: '24px',
            letterSpacing: '0.06em',
          }}
        >
          LIVE ON VERCEL & OPEN SOURCE
        </div>

        <h2
          style={{
            fontSize: '64px',
            fontWeight: 900,
            margin: '0 0 20px 0',
            letterSpacing: '-0.02em',
          }}
        >
          Get Your Agent Ready Today
        </h2>

        <p
          style={{
            fontSize: '32px',
            color: '#D1C5B4',
            margin: '0 0 40px 0',
            fontFamily: 'monospace',
          }}
        >
          https://technocore-studio-ten.vercel.app/
        </p>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#292524', border: '1px solid #44403C', padding: '12px 28px', borderRadius: '12px', fontSize: '20px', fontWeight: 700 }}>
            💻 GitHub: Admuad/technocore-studio
          </div>
          <div style={{ backgroundColor: '#292524', border: '1px solid #44403C', padding: '12px 28px', borderRadius: '12px', fontSize: '20px', fontWeight: 700 }}>
            🐦 X: @flop_labs / @adedir2
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
