/**
 * Mediapipe Face Mesh Loader
 * Loads the FaceLandmarker model once and exports a singleton instance.
 */

let landmarkerInstance = null;
let landmarkerPromise = null;

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * Initializes and returns the shared FaceLandmarker instance.
 */
export async function getFaceLandmarker() {
  if (landmarkerInstance) {
    return landmarkerInstance;
  }
  if (landmarkerPromise) {
    return landmarkerPromise;
  }

  landmarkerPromise = (async () => {
    try {
      let visionModule;
      // In bundled Vite React app, import from package directly
      try {
        visionModule = await import('@mediapipe/tasks-vision');
      } catch {
        // Fallback for standalone static HTML
        visionModule = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
      }

      const { FilesetResolver, FaceLandmarker } = visionModule;
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);

      let landmarker = null;
      try {
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU'
          },
          runningMode: 'IMAGE',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5
        });
      } catch (gpuErr) {
        console.warn('FaceLandmarker GPU init failed, trying CPU fallback:', gpuErr);
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU'
          },
          runningMode: 'IMAGE',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5
        });
      }

      landmarkerInstance = landmarker;
      return landmarker;
    } catch (err) {
      console.warn('FaceLandmarker load fallback:', err);
      return null;
    }
  })();

  return landmarkerPromise;
}

/**
 * Detects face landmarks and bounding box on a canvas, image, or video element.
 * Returns { landmarks, boundingBox, yaw } or null
 */
export async function detectFace(canvasOrVideo) {
  try {
    const landmarker = await getFaceLandmarker();
    if (!landmarker) return null;

    const result = landmarker.detect(canvasOrVideo);
    if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
      return null;
    }

    const landmarks = result.faceLandmarks[0];
    const width = canvasOrVideo.videoWidth || canvasOrVideo.width || 640;
    const height = canvasOrVideo.videoHeight || canvasOrVideo.height || 480;

    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (lm.x < minX) minX = lm.x;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.y > maxY) maxY = lm.y;
    }

    const box = {
      x: minX * width,
      y: minY * height,
      width: (maxX - minX) * width,
      height: (maxY - minY) * height
    };

    // Calculate approximate yaw
    const nose = landmarks[1] || landmarks[4] || landmarks[0];
    const leftCheek = landmarks[234] || landmarks[33] || { x: minX };
    const rightCheek = landmarks[454] || landmarks[263] || { x: maxX };
    const cheekMidX = (leftCheek.x + rightCheek.x) / 2;
    const span = Math.abs(rightCheek.x - leftCheek.x);
    const yaw = ((nose.x - cheekMidX) / (span || 0.5)) * 90;

    return {
      landmarks,
      box,
      yaw
    };
  } catch (err) {
    console.error('Error running face landmark detection:', err);
    return null;
  }
}
