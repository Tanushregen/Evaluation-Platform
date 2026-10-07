import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Sun, RotateCcw } from 'lucide-react';
import { candidateApi } from '../../services/api';
import { getCachedStreams } from '../../services/devicePermissionService';
import { acquireVerifiedCameraStream } from '../../services/cameraDeviceService';
import { sampleBrightness, isRoomBrightEnough } from '../../services/clientRoomCheckService';
import talentstaQLogo from '../../assets/assessment-icons/icons/Talentstaq logo dark.svg';

interface TestDetails {
  test: {
    id: string;
    requireRoomCheck: boolean;
  };
}

type Phase = 'loading' | 'checking' | 'result';

/**
 * Check-in process: normal-browser counterpart to SebRoomCheck.tsx. Brightness
 * only — no face-detection pass here. NORMAL_BROWSER tests deliberately never
 * run client-side detection models (detectionMode is always 'server' for this
 * mode, see NormalBrowserEnvironmentSetup.tsx's comment); loading MediaPipe
 * just for this one-off check would break that invariant for a single-frame
 * face check. Brightness is a plain canvas pixel sample — no model needed —
 * so it still catches the "sitting in the dark" case either way.
 */
export default function NormalBrowserRoomCheck() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [brightness, setBrightness] = useState(0);
  const [passed, setPassed] = useState(false);
  const [checking, setChecking] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ownsStreamRef = useRef(false);
  const ranRef = useRef(false);

  const runCheck = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setChecking(true);
    try {
      const b = sampleBrightness(video);
      const ok = isRoomBrightEnough(b);
      setBrightness(b);
      setPassed(ok);
      setPhase('result');

      candidateApi
        .logActivity({
          eventType: ok ? 'room_check_passed' : 'room_check_failed',
          eventData: { brightness: Math.round(b), brightnessOk: ok, faceDetected: null },
        })
        .catch(() => {});

      if (ok) {
        window.setTimeout(() => navigate('/test/id-verification', { replace: true }), 900);
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      let testDetails: TestDetails;
      try {
        const { data } = await candidateApi.getTestDetails();
        testDetails = data;
      } catch {
        toast.error('Session expired — please log in again');
        navigate('/test/login');
        return;
      }

      if (!testDetails.test.requireRoomCheck) {
        navigate('/test/id-verification', { replace: true });
        return;
      }

      let stream = getCachedStreams().cameraStream;
      if (!stream) {
        const result = await acquireVerifiedCameraStream({ width: { ideal: 1280 }, height: { ideal: 720 } });
        stream = result.stream;
        ownsStreamRef.current = true;
      }

      if (!stream || !videoRef.current) {
        toast.error('Could not access your camera for the room check');
        navigate('/test/id-verification', { replace: true });
        return;
      }

      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        /* autoplay blocked — candidate can still see the preview once interacted */
      }

      setPhase('checking');
      window.setTimeout(() => { void runCheck(); }, 1500);
    })();

    return () => {
      if (ownsStreamRef.current && videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--admin-bg)' }}>
      <header className="bg-white border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center">
          <img src={talentstaQLogo} alt="TalentstaQ" style={{ height: '30px', width: 'auto' }} />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div
          className="w-full max-w-md bg-white rounded-2xl p-8 text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)' }}
        >
          <h1 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
            Check-in: Room check
          </h1>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--admin-text-muted)' }}>
            Make sure your room is well lit before you continue.
          </p>

          <div
            className="relative rounded-xl overflow-hidden mb-5"
            style={{ aspectRatio: '4 / 3', background: '#111827' }}
          >
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          </div>

          {phase !== 'result' && (
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              {checking ? 'Checking your room…' : 'Getting your camera ready…'}
            </p>
          )}

          {phase === 'result' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="flex items-center gap-1.5" style={{ color: isRoomBrightEnough(brightness) ? '#16A34A' : '#DC2626' }}>
                  <Sun width={15} height={15} /> {isRoomBrightEnough(brightness) ? 'Well lit' : 'Too dark'}
                </span>
              </div>

              {passed ? (
                <p className="text-sm font-medium" style={{ color: '#16A34A' }}>Looks good — continuing…</p>
              ) : (
                <>
                  <p className="text-sm font-medium" style={{ color: '#DC2626' }}>
                    Your room looks too dark — try turning on a light or facing a window.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setPhase('checking'); void runCheck(); }}
                    disabled={checking}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--admin-accent)', opacity: checking ? 0.6 : 1 }}
                  >
                    <RotateCcw width={14} height={14} /> Check again
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
