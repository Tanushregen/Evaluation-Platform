import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Sun, ScanFace, RotateCcw } from 'lucide-react';
import { candidateApi } from '../../services/api';
import { getCachedStreams } from '../../services/devicePermissionService';
import { acquireVerifiedCameraStream } from '../../services/cameraDeviceService';
import { loadClientFaceMesh, runClientFaceMesh } from '../../services/clientFaceMeshService';
import { sampleBrightness, isRoomBrightEnough } from '../../services/clientRoomCheckService';
import talentstaQLogo from '../../assets/assessment-icons/icons/Talentstaq logo dark.svg';

interface TestDetails {
  test: {
    id: string;
    requireRoomCheck: boolean;
  };
}

type Phase = 'loading' | 'checking' | 'result';

function handleSebExit() {
  const sebQuitUrl = localStorage.getItem('sebQuitUrl');
  if (sebQuitUrl) {
    window.location.href = sebQuitUrl;
  }
}

/**
 * Check-in process: Page 2.5 of the SEB pre-exam flow (System Check →
 * Environment Setup → here → ID Verification → Instructions → Start), shown
 * only when the test's requireRoomCheck setting is on. Verifies the room is
 * bright enough and a face is visible before letting the candidate continue
 * — same "well-lit room, face visible" check Pearson-style testing centers
 * do at physical check-in.
 *
 * Reuses the camera stream System Check already granted (via
 * getCachedStreams — must NOT be stopped, useProctoring.ts reuses it for the
 * real exam) when the test also requires a camera for proctoring. Falls back
 * to acquiring its own stream otherwise (requireRoomCheck without
 * requireCamera is a valid, if unusual, admin configuration) — that
 * fallback stream IS stopped on unmount since nothing else owns it.
 */
export default function SebRoomCheck() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [brightness, setBrightness] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
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
      const brightnessOk = isRoomBrightEnough(b);

      let faceOk = false;
      try {
        const landmarker = await loadClientFaceMesh();
        const signal = runClientFaceMesh(landmarker, video);
        faceOk = signal.faceCount > 0;
      } catch {
        // Face model unavailable this cycle — don't block the candidate on an
        // infra hiccup unrelated to their actual room/lighting.
        faceOk = true;
      }

      setBrightness(b);
      setFaceDetected(faceOk);
      const ok = brightnessOk && faceOk;
      setPassed(ok);
      setPhase('result');

      candidateApi
        .logActivity({
          eventType: ok ? 'room_check_passed' : 'room_check_failed',
          eventData: { brightness: Math.round(b), brightnessOk, faceDetected: faceOk },
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
    <div className="h-screen flex flex-col relative overflow-hidden" style={{ background: '#F3F6FB' }}>
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, #DCE6FB 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <header className="relative flex-shrink-0 bg-white border-b shadow-sm" style={{ borderColor: 'var(--admin-border-soft)' }}>
        <div className="max-w-[1180px] mx-auto px-6 sm:px-10 py-3 sm:py-4 flex items-center justify-between">
          <img src={talentstaQLogo} alt="TalentstaQ" style={{ height: '28px', width: 'auto' }} />
          <button
            type="button"
            onClick={handleSebExit}
            className="text-sm font-medium"
            style={{ color: '#6B7280' }}
          >
            Exit
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 relative">
        <div
          className="w-full max-w-md bg-white rounded-2xl p-8 text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)' }}
        >
          <h1 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
            Check-in: Room check
          </h1>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--admin-text-muted)' }}>
            Make sure your face is visible and your room is well lit.
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
                <span className="flex items-center gap-1.5" style={{ color: faceDetected ? '#16A34A' : '#DC2626' }}>
                  <ScanFace width={15} height={15} /> {faceDetected ? 'Face visible' : 'No face detected'}
                </span>
              </div>

              {passed ? (
                <p className="text-sm font-medium" style={{ color: '#16A34A' }}>Looks good — continuing…</p>
              ) : (
                <>
                  <p className="text-sm font-medium" style={{ color: '#DC2626' }}>
                    {!isRoomBrightEnough(brightness) && !faceDetected
                      ? 'Turn on a light and make sure your face is in frame.'
                      : !isRoomBrightEnough(brightness)
                      ? 'Your room looks too dark — try turning on a light or facing a window.'
                      : 'We can’t see your face clearly — move closer to the camera.'}
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
