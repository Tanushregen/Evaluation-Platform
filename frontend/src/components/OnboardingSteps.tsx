import { Check } from 'lucide-react';

export type OnboardingStepKey = 'system-check' | 'room-check' | 'id-verification' | 'instructions' | 'start';

const STEPS: { key: OnboardingStepKey; label: string }[] = [
  { key: 'system-check', label: 'System Check' },
  { key: 'room-check', label: 'Room Check' },
  { key: 'id-verification', label: 'Identity Verification' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'start', label: 'Start Assessment' },
];

/**
 * Progress indicator shown across the candidate pre-exam flow (System Check →
 * Room Check → Identity Verification → Instructions → Start Assessment).
 * `current` is whichever step the candidate is on right now; everything
 * before it renders as done (checkmark), everything after as upcoming.
 */
export default function OnboardingSteps({ current }: { current: OnboardingStepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        width: '100%',
        maxWidth: '760px',
        margin: '0 auto',
        padding: '18px 16px 8px',
        overflowX: 'auto',
      }}
    >
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const isFilled = isDone || isActive;

        return (
          <div
            key={step.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: i < STEPS.length - 1 ? 1 : '0 0 auto',
              minWidth: i < STEPS.length - 1 ? '60px' : undefined,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isFilled ? 'var(--admin-accent)' : '#E5E7EB',
                  color: isFilled ? 'white' : '#9CA3AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {isDone ? <Check size={14} /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  color: isFilled ? 'var(--admin-text)' : '#9CA3AF',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  minWidth: '16px',
                  backgroundColor: isDone ? 'var(--admin-accent)' : '#E5E7EB',
                  margin: '0 6px 20px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
