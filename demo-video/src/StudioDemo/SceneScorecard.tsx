import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const SceneScorecard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progressSpr = spring({
    frame: frame - 10,
    fps,
    config: { damping: 18, mass: 1 },
  });

  const percentage = Math.round(interpolate(progressSpr, [0, 1], [0, 100]));

  const checklist = [
    { title: 'Agent DID Generated', desc: 'did:key:z6Mk... active', doneAt: 15 },
    { title: 'Private Key Backup (.env)', desc: 'Secured offline', doneAt: 30 },
    { title: 'Lobby Check-In Signed', desc: 'Sequence #65866429 confirmed', doneAt: 45 },
    { title: 'Contribution Proof Anchored', desc: 'Recorded in room technocore', doneAt: 60 },
    { title: 'Ecosystem Role Track Chosen', desc: 'Builder / Creator Track Selected', doneAt: 75 },
  ];

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
      <div
        style={{
          width: '100%',
          maxWidth: '1000px',
          backgroundColor: '#FFFFFF',
          border: '2px solid #E8DCCB',
          borderRadius: '24px',
          padding: '48px',
          boxShadow: '0 8px 32px rgba(167, 146, 119, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1C1917', margin: '0 0 8px 0' }}>
              Dynamic Airdrop Readiness Score
            </h2>
            <p style={{ fontSize: '18px', color: '#6E5D4B', margin: 0 }}>
              Live evaluation for FLOP Labs Testnet qualification
            </p>
          </div>
          <div
            style={{
              backgroundColor: percentage === 100 ? '#EDF7F1' : '#ECE4D8',
              color: percentage === 100 ? '#1E6B45' : '#1C1917',
              border: `2px solid ${percentage === 100 ? '#BCE3CE' : '#D1C5B4'}`,
              padding: '12px 28px',
              borderRadius: '9999px',
              fontSize: '24px',
              fontWeight: 800,
            }}
          >
            {percentage}% Ready
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '16px',
            backgroundColor: '#F5EADB',
            borderRadius: '9999px',
            overflow: 'hidden',
            marginBottom: '36px',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: percentage === 100 ? '#1E6B45' : '#1C1917',
              borderRadius: '9999px',
              transition: 'background-color 0.3s ease',
            }}
          />
        </div>

        {/* Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {checklist.map((item, idx) => {
            const isDone = frame >= item.doneAt;
            const spr = spring({
              frame: frame - item.doneAt,
              fps,
              config: { damping: 12, mass: 0.5 },
            });

            return (
              <div
                key={item.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 20px',
                  backgroundColor: isDone ? '#EDF7F1' : '#FDFBF7',
                  border: `1px solid ${isDone ? '#BCE3CE' : '#E8DCCB'}`,
                  borderRadius: '10px',
                  transform: isDone ? `scale(${spr})` : 'scale(1)',
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 800, color: isDone ? '#1E6B45' : '#A79277' }}>
                  {isDone ? '✓' : '○'}
                </span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1C1917', flex: 1 }}>
                  {item.title}
                </span>
                <span style={{ fontSize: '15px', color: '#57534E', fontWeight: 500 }}>
                  {item.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
