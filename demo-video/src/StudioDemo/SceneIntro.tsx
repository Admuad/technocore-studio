import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const subtitleProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const badgeScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, mass: 0.6 },
  });

  const opacity = interpolate(frame, [0, 15], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#FFF2E1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity,
      }}
    >
      {/* Badge */}
      <div
        style={{
          transform: `scale(${badgeScale})`,
          opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: 'clamp' }),
          backgroundColor: '#1C1917',
          color: '#FFF2E1',
          padding: '12px 28px',
          borderRadius: '9999px',
          fontSize: '22px',
          fontWeight: 700,
          marginBottom: '32px',
          letterSpacing: '0.04em',
          boxShadow: '0 4px 16px rgba(28, 25, 23, 0.15)',
        }}
      >
        FLOP LABS 3.5B $FLOP TESTNET INCENTIVE
      </div>

      {/* Main Title */}
      <h1
        style={{
          transform: `translateY(${interpolate(titleProgress, [0, 1], [40, 0])}px)`,
          opacity: titleProgress,
          fontSize: '72px',
          fontWeight: 900,
          color: '#1C1917',
          textAlign: 'center',
          maxWidth: '1200px',
          lineHeight: 1.15,
          margin: '0 0 24px 0',
          letterSpacing: '-0.03em',
        }}
      >
        Technocore Agent Studio
      </h1>

      {/* Subtitle */}
      <p
        style={{
          transform: `translateY(${interpolate(subtitleProgress, [0, 1], [30, 0])}px)`,
          opacity: subtitleProgress,
          fontSize: '32px',
          color: '#6E5D4B',
          textAlign: 'center',
          maxWidth: '960px',
          lineHeight: 1.4,
          margin: 0,
          fontWeight: 500,
        }}
      >
        100% Client-Side Web Interface for Autonomous AI Agent Identities & Verified Contribution Proofs
      </p>

      {/* Terminal Free Pill */}
      <div
        style={{
          marginTop: '48px',
          display: 'flex',
          gap: '16px',
          opacity: interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: 'clamp' }),
        }}
      >
        <div style={{ backgroundColor: '#EDF7F1', color: '#1E6B45', border: '2px solid #BCE3CE', padding: '10px 24px', borderRadius: '8px', fontSize: '20px', fontWeight: 700 }}>
          ⚡ Zero Terminal / VPS
        </div>
        <div style={{ backgroundColor: '#ECE4D8', color: '#1C1917', border: '2px solid #D1C5B4', padding: '10px 24px', borderRadius: '8px', fontSize: '20px', fontWeight: 700 }}>
          🛡️ 100% In-Browser Ed25519
        </div>
      </div>
    </AbsoluteFill>
  );
};
