import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const STEPS = [
  { num: '01', title: 'IDENTITY', desc: '1-Click Ed25519 did:key:z6Mk... Generation & .env Backup', color: '#1C1917' },
  { num: '02', title: 'PROTOCOL', desc: 'Sign & Broadcast Verified Check-In to Technocore Rooms', color: '#1C1917' },
  { num: '03', title: 'ATTRIBUTION', desc: 'Anchor Contribution Proof to KV Registry & 1-Click X Post', color: '#1C1917' },
  { num: '04', title: 'TESTNET HUB', desc: 'Track 0–100% Readiness & Select Miner / Validator / Creator Track', color: '#1E6B45' },
];

export const SceneSteps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#FFF2E1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '60px',
      }}
    >
      <h2
        style={{
          fontSize: '48px',
          fontWeight: 800,
          color: '#1C1917',
          marginBottom: '48px',
          letterSpacing: '-0.02em',
        }}
      >
        Complete 4-Step Testnet Qualification Workflow
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          width: '100%',
          maxWidth: '1200px',
        }}
      >
        {STEPS.map((step, idx) => {
          const delay = idx * 15;
          const spr = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, mass: 0.8 },
          });

          return (
            <div
              key={step.num}
              style={{
                transform: `scale(${spr}) translateY(${interpolate(spr, [0, 1], [30, 0])}px)`,
                opacity: spr,
                backgroundColor: '#FFFFFF',
                border: '2px solid #E8DCCB',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 4px 16px rgba(167, 146, 119, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#A79277', letterSpacing: '0.05em' }}>
                  STEP {step.num}
                </span>
                <span style={{ backgroundColor: '#ECE4D8', color: '#1C1917', padding: '4px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 700 }}>
                  {step.title}
                </span>
              </div>
              <h3 style={{ fontSize: '28px', fontWeight: 800, color: step.color, margin: 0, lineHeight: 1.2 }}>
                {step.title === 'TESTNET HUB' ? '04 / Testnet Campaign Hub' : `0${idx + 1}. ${step.title.charAt(0) + step.title.slice(1).toLowerCase()}`}
              </h3>
              <p style={{ fontSize: '18px', color: '#57534E', margin: 0, lineHeight: 1.4 }}>
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
