// Check-in process: a Pearson-style room check run once before the exam starts (between
// environment-setup and ID verification — see RoomCheck.tsx/SebRoomCheck.tsx/
// NormalBrowserRoomCheck.tsx), gated by the test's requireRoomCheck setting. Verifies the
// candidate's room is bright enough and (SEB only — see below) that a face is visible,
// using a single frame from the already-granted camera stream.

export interface RoomCheckResult {
  passed: boolean;
  brightness: number;
  brightnessOk: boolean;
  // null when this mode doesn't run face detection (NORMAL_BROWSER — see
  // NormalBrowserRoomCheck.tsx for why) rather than false, so callers can tell
  // "no face found" apart from "didn't check".
  faceDetected: boolean | null;
}

// Average per-pixel luma (ITU-R BT.601), sampled on a small downscaled canvas — same
// technique as cameraDeviceService.ts's sampleColorfulness, different metric. 0 (black) to
// 255 (white). A dim room/backlit candidate sits low; normal indoor lighting is comfortably
// above this threshold in practice.
const MIN_BRIGHTNESS = 60;

export function sampleBrightness(source: HTMLVideoElement | HTMLCanvasElement): number {
  try {
    const canvas = document.createElement('canvas');
    const w = 64;
    const h = 48;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    ctx.drawImage(source, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let sumLuma = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sumLuma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return sumLuma / pixelCount;
  } catch {
    return 0;
  }
}

export function isRoomBrightEnough(brightness: number): boolean {
  return brightness >= MIN_BRIGHTNESS;
}

export { MIN_BRIGHTNESS };
