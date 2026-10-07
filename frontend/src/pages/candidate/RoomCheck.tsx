import { useEffect, useState } from 'react';
import { candidateApi } from '../../services/api';
import NormalBrowserRoomCheck from './NormalBrowserRoomCheck';
import SebRoomCheck from './SebRoomCheck';

type AssessmentMode = 'SEB' | 'NORMAL_BROWSER';

/**
 * Dispatcher for the Check-in process step — same pattern as
 * IdVerification.tsx/TestInstructions.tsx/SystemCheck.tsx. The two
 * implementations differ in what they check (SEB also runs a face-detection
 * pass; normal-browser is brightness-only, see NormalBrowserRoomCheck.tsx)
 * as well as navigation chrome.
 */
export default function RoomCheck() {
  const [mode, setMode] = useState<AssessmentMode | null>(null);

  useEffect(() => {
    let cancelled = false;

    candidateApi
      .getTestDetails()
      .then(({ data }) => {
        if (cancelled) return;
        const resolvedMode: AssessmentMode =
          data.test?.assessmentMode === 'NORMAL_BROWSER' ? 'NORMAL_BROWSER' : 'SEB';
        setMode(resolvedMode);
      })
      .catch(() => {
        if (!cancelled) setMode((currentMode) => currentMode ?? 'SEB');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!mode) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--admin-border)', color: '#6B7280' }}
      >
        Loading…
      </div>
    );
  }

  return mode === 'NORMAL_BROWSER' ? <NormalBrowserRoomCheck /> : <SebRoomCheck />;
}
