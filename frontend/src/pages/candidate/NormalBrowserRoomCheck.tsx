import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Sun, RotateCcw, AlertCircle } from 'lucide-react';
import { candidateApi } from '../../services/api';
import { getCachedStreams } from '../../services/devicePermissionService';
import { acquireVerifiedCameraStream } from '../../services/cameraDeviceService';
import { sampleBrightness, isRoomBrightEnough } from '../../services/clientRoomCheckService';
import talentstaQLogo from '../../assets/assessment-icons/icons/Talentstaq logo dark.svg';
import OnboardingSteps from '../../components/OnboardingSteps';
import RoomCheckGuidelines from '../../components/RoomCheckGuidelines';

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
        window.setTimeout(() => navigate('/test/id-verification', { replace: true }), 2000);
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

  const wellLit = isRoomBrightEnough(brightness);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--admin-bg)' }}>
      <header className="bg-white border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center">
          <img src={talentstaQLogo} alt="TalentstaQ" style={{ height: '30px', width: 'auto' }} />
        </div>
      </header>

      <OnboardingSteps current="room-check" />

      <main className="flex-1 px-4 pb-10 pt-2">
        <div className="max-w-4xl mx-auto grid gap-5" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,300px)' }}>
          <div
            className="bg-white rounded-2xl p-6"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)' }}
          >
            <h1 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>
              Check Your Room Lighting
            </h1>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--admin-text-muted)' }}>
              Make sure your room is well lit and your face is clearly visible before you continue.
            </p>

            <div
              className="relative rounded-xl overflow-hidden mb-4"
              style={{ aspectRatio: '16 / 9', background: '#111827' }}
            >
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              {phase === 'result' && (
                <span
                  className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: wellLit ? 'rgba(22,163,74,0.9)' : 'rgba(220,38,38,0.9)', color: 'white' }}
                >
                  <Sun width={12} height={12} /> {wellLit ? 'Well lit' : 'Low light'}
                </span>
              )}
            </div>

            {phase !== 'result' && (
              <p className="text-sm text-center" style={{ color: 'var(--admin-text-muted)' }}>
                {checking ? 'Checking your room…' : 'Getting your camera ready…'}
              </p>
            )}

            {phase === 'result' && (
              <div>
                {passed ? (
                  <p className="text-sm font-medium text-center" style={{ color: '#16A34A' }}>Looks good — continuing…</p>
                ) : (
                  <>
                    <div
                      className="flex items-start gap-3 rounded-xl p-4 mb-4"
                      style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2' }}
                    >
                      <AlertCircle width={18} height={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>Your room looks too dark</p>
                        <p className="text-sm" style={{ color: '#B91C1C' }}>
                          Try turning on a light or face a window so that your face is clearly visible.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => { setPhase('checking'); void runCheck(); }}
                        disabled={checking}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: 'var(--admin-accent)', opacity: checking ? 0.6 : 1 }}
                      >
                        <RotateCcw width={14} height={14} /> Check again
                      </button>
                    </div>
                  </>
                )}
                <p className="text-xs text-center mt-4" style={{ color: 'var(--admin-text-subtle)' }}>
                  Once the lighting is good, you can continue to the next step.
                </p>
              </div>
            )}
          </div>

          <RoomCheckGuidelines />
        </div>
      </main>
    </div>
  );
}
