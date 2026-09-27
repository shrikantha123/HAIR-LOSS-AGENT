/**
 * Scalp Photo Validation Module
 * Shared validation logic for both Live Camera mode and Upload mode.
 * 
 * Non-negotiable design principle: Lenient, tiered quality gating
 * - 'good': clearly passes
 * - 'usable': imperfect but a vision LLM can still assess it (COUNTS AS PASS)
 * - 'reject': genuinely unusable, even a human couldn't assess it
 */

/**
 * 1. Lighting check
 * Input: canvas ImageData
 * Output: { tier: 'good'|'usable'|'reject', reason: string|null, mean: number, blownPct: number }
 */
export function checkLighting(imageData) {
  const data = imageData.data;
  const totalPixels = imageData.width * imageData.height;
  if (!totalPixels) {
    return { tier: 'reject', reason: 'Invalid image data', mean: 0, blownPct: 0 };
  }

  // Downsample sampling step for performance on large images
  const step = Math.max(1, Math.floor(Math.sqrt(totalPixels / 250000))) * 4;
  let sumLuminance = 0;
  let blownCount = 0;
  let sampleCount = 0;

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard perceptual grayscale luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumLuminance += lum;
    if (lum > 240) {
      blownCount++;
    }
    sampleCount++;
  }

  const mean = sumLuminance / (sampleCount || 1);
  const blownPct = (blownCount / (sampleCount || 1)) * 100;

  // Rules:
  // mean < 40 -> reject, "Too dark to assess scalp detail"
  // mean > 220 -> reject, "Overexposed, detail is washed out"
  // blown-out % > 25 -> reject, "Too much glare, detail is lost"
  // mean 70-170 AND blown-out % < 10 -> good
  // otherwise (within 40-220, not rejected) -> usable
  if (mean < 40) {
    return {
      tier: 'reject',
      reason: 'Too dark to assess scalp detail',
      mean: Math.round(mean),
      blownPct: Math.round(blownPct)
    };
  }
  if (mean > 220) {
    return {
      tier: 'reject',
      reason: 'Overexposed, detail is washed out',
      mean: Math.round(mean),
      blownPct: Math.round(blownPct)
    };
  }
  if (blownPct > 25) {
    return {
      tier: 'reject',
      reason: 'Too much glare, detail is lost',
      mean: Math.round(mean),
      blownPct: Math.round(blownPct)
    };
  }
  if (mean >= 70 && mean <= 170 && blownPct < 10) {
    return {
      tier: 'good',
      reason: null,
      mean: Math.round(mean),
      blownPct: Math.round(blownPct)
    };
  }

  return {
    tier: 'usable',
    reason: null,
    mean: Math.round(mean),
    blownPct: Math.round(blownPct)
  };
}

/**
 * 2. Blur / sharpness check using 3x3 Laplacian operator
 * Edge response kernel:
 * [ 0,  1,  0]
 * [ 1, -4,  1]
 * [ 0,  1,  0]
 * 
 * Rules (starting thresholds - calibrate against real test photos as needed):
 * - variance < 30 -> reject, "Photo is too blurry, please hold steady and retake"
 * - variance 30-100 -> usable
 * - variance > 100 -> good
 */
export function checkBlur(imageData) {
  const { width, height, data } = imageData;
  if (width < 3 || height < 3) {
    return { tier: 'reject', reason: 'Image too small to evaluate sharpness', variance: 0 };
  }

  // To maintain fast 60fps/10fps performance, process at reasonable scale (max 320px width)
  const scale = width > 320 ? Math.ceil(width / 320) : 1;
  const sw = Math.floor(width / scale);
  const sh = Math.floor(height / scale);

  // Extract grayscale grid
  const gray = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    const srcY = y * scale;
    for (let x = 0; x < sw; x++) {
      const srcX = x * scale;
      const idx = (srcY * width + srcX) * 4;
      gray[y * sw + x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
  }

  // Apply 3x3 Laplacian kernel and compute variance
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < sh - 1; y++) {
    const row = y * sw;
    for (let x = 1; x < sw - 1; x++) {
      const center = gray[row + x];
      const up = gray[row - sw + x];
      const down = gray[row + sw + x];
      const left = gray[row + x - 1];
      const right = gray[row + x + 1];

      // [0, 1, 0] + [1, -4, 1] + [0, 1, 0]
      const lap = up + down + left + right - 4 * center;
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) {
    return { tier: 'reject', reason: 'Could not compute sharpness', variance: 0 };
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;

  // Threshold calibration:
  // < 30: reject
  // 30 - 100: usable
  // > 100: good
  if (variance < 30) {
    return {
      tier: 'reject',
      reason: 'Photo is too blurry, please hold steady and retake',
      variance: Math.round(variance)
    };
  }
  if (variance >= 30 && variance <= 100) {
    return {
      tier: 'usable',
      reason: null,
      variance: Math.round(variance)
    };
  }

  return {
    tier: 'good',
    reason: null,
    variance: Math.round(variance)
  };
}

/**
 * 3. Framing / distance check
 * Computes bounding box width as % of frame width.
 * 
 * Rules:
 * - < 20% -> reject, "Too far away, scalp detail not visible"
 * - > 85% -> reject, "Too close, view is cut off"
 * - 20-35% or 60-85% -> usable
 * - 35-60% -> good
 * 
 * On-screen guidance prompts:
 * - < 35%: "Come closer"
 * - > 60%: "Move back"
 * - 35-60%: "Good position"
 */
export function checkFraming(boxOrNull, frameWidth) {
  if (!boxOrNull || !frameWidth) {
    // If no face detected, check if crown blob was supplied or pass lenient usable for crown
    return {
      tier: 'usable',
      reason: null,
      widthPct: 45,
      guidance: 'Position your head in the oval guide'
    };
  }

  const widthPct = Math.round((boxOrNull.width / frameWidth) * 100);

  let guidance = 'Good position';
  if (widthPct < 35) {
    guidance = 'Come closer';
  } else if (widthPct > 60) {
    guidance = 'Move back';
  }

  if (widthPct < 20) {
    return {
      tier: 'reject',
      reason: 'Too far away, scalp detail not visible',
      widthPct,
      guidance: 'Come closer'
    };
  }
  if (widthPct > 85) {
    return {
      tier: 'reject',
      reason: 'Too close, view is cut off',
      widthPct,
      guidance: 'Move back'
    };
  }
  if ((widthPct >= 20 && widthPct < 35) || (widthPct > 60 && widthPct <= 85)) {
    return {
      tier: 'usable',
      reason: null,
      widthPct,
      guidance
    };
  }

  return {
    tier: 'good',
    reason: null,
    widthPct,
    guidance: 'Good position'
  };
}

/**
 * Color consistency / hair-scalp blob detector for Crown view
 */
function analyzeScalpBlob(imageData) {
  const { width, height, data } = imageData;
  // Sample center region: x 25%-75%, y 20%-80%
  const startX = Math.floor(width * 0.25);
  const endX = Math.floor(width * 0.75);
  const startY = Math.floor(height * 0.20);
  const endY = Math.floor(height * 0.80);

  let hairScalpPixels = 0;
  let totalSampled = 0;

  for (let y = startY; y < endY; y += 4) {
    for (let x = startX; x < endX; x += 4) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Hair & scalp colors: dark brown/black (lum < 95), or blonde/brown/skin tone (r > b && g > b/2 && lum < 220)
      const isDarkHair = lum < 100;
      const isWarmHairOrScalp = r > b && (r - b) > 10 && lum > 60 && lum < 220;
      const isGreyHair = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && lum >= 100 && lum <= 215;

      if (isDarkHair || isWarmHairOrScalp || isGreyHair) {
        hairScalpPixels++;
      }
      totalSampled++;
    }
  }

  const coveragePct = (hairScalpPixels / (totalSampled || 1)) * 100;
  return coveragePct;
}

/**
 * 4. View-match check
 * Front: MediaPipe landmarks detected, yaw within ~+-20 deg
 * Side: MediaPipe landmarks detected, yaw > 42 deg
 * Crown: No MediaPipe face detected AND (phone tilted downward beta > 35 deg OR center hair blob > 40%)
 * If uncertain -> always accept (confidence: 'low')
 */
export function checkViewMatch(landmarksOrBox, deviceOrientationOrNull, imageData, expectedView) {
  const normExpected = (expectedView || '').toLowerCase().trim();

  // If landmarks are available:
  let hasFace = false;
  let yawDeg = 0;

  if (landmarksOrBox && landmarksOrBox.landmarks && landmarksOrBox.landmarks.length > 0) {
    hasFace = true;
    const lms = landmarksOrBox.landmarks;

    // MediaPipe face mesh landmarks:
    // Nose tip: index 1 or 4
    // Left cheek outer: 234
    // Right cheek outer: 454
    const nose = lms[1] || lms[4] || lms[0];
    const leftCheek = lms[234] || lms[33] || { x: 0.2 };
    const rightCheek = lms[454] || lms[263] || { x: 0.8 };

    const cheekMidX = (leftCheek.x + rightCheek.x) / 2;
    const span = Math.abs(rightCheek.x - leftCheek.x);
    const diff = (nose.x - cheekMidX) / (span || 0.5);

    // Approximate yaw in degrees: range ~ -90 to +90
    yawDeg = diff * 90;
  } else if (landmarksOrBox && typeof landmarksOrBox.yaw === 'number') {
    hasFace = true;
    yawDeg = landmarksOrBox.yaw;
  }

  let detectedView = 'uncertain';
  let confidence = 'low';

  if (hasFace) {
    const absYaw = Math.abs(yawDeg);
    if (absYaw <= 24) {
      detectedView = 'front';
      confidence = 'high';
    } else if (absYaw >= 42) {
      detectedView = 'side';
      confidence = 'high';
    } else {
      detectedView = 'uncertain';
      confidence = 'low';
    }
  } else {
    // No face detected - test for Crown
    // A crown photo must have downward tilt (gyroscope) or be labeled as crown with a valid scalp blob
    const beta = deviceOrientationOrNull ? deviceOrientationOrNull.beta : null;
    const hasOrientation = typeof beta === 'number';
    const isTiltedDown = hasOrientation && (beta > 35 || beta < -35);
    const blobCoverage = imageData ? analyzeScalpBlob(imageData) : 50;

    if (isTiltedDown && blobCoverage > 40) {
      detectedView = 'crown';
      confidence = 'high';
    } else if (normExpected === 'crown' && blobCoverage > 30) {
      // User tagged photo as crown and center hair/scalp blob matches
      detectedView = 'crown';
      confidence = 'high';
    } else if (blobCoverage > 35) {
      detectedView = 'uncertain';
      confidence = 'low';
    } else {
      detectedView = 'uncertain';
      confidence = 'low';
    }
  }

  // Rejection logic:
  // Only reject for view mismatch when confidence is HIGH AND detectedView clearly contradicts expected
  // If uncertain or low confidence, ALWAYS ACCEPT (lenient design principle).
  let isMismatch = false;
  let reason = null;

  if (confidence === 'high' && detectedView !== 'uncertain' && detectedView !== normExpected) {
    isMismatch = true;
    reason = `This looks like a ${detectedView} view, not ${normExpected}`;
  }

  return {
    detectedView,
    confidence,
    match: !isMismatch,
    reason,
    yawDeg: Math.round(yawDeg)
  };
}

/**
 * 5. Combined decision function
 * Single shared entry point called by both live-capture.js and upload-validate.js
 * 
 * Priority order when rejecting: blur -> lighting -> framing -> view mismatch
 * @param {ImageData} imageData
 * @param {string} expectedView
 * @param {any} [faceBoxOrNull]
 * @param {any} [deviceOrientationOrNull]
 * @param {any} [landmarksOrBox]
 */
export function evaluatePhoto(imageData, expectedView, faceBoxOrNull = null, deviceOrientationOrNull = null, landmarksOrBox = null) {
  const lighting = checkLighting(imageData);
  const blur = checkBlur(imageData);
  const framing = checkFraming(faceBoxOrNull, imageData.width);
  const viewMatch = checkViewMatch(landmarksOrBox || faceBoxOrNull, deviceOrientationOrNull, imageData, expectedView);

  // Priority order when rejecting: blur -> lighting -> framing -> view mismatch
  if (blur.tier === 'reject') {
    return {
      accepted: false,
      rejectCategory: 'blur',
      reason: blur.reason,
      checks: { lighting, blur, framing, viewMatch }
    };
  }

  if (lighting.tier === 'reject') {
    return {
      accepted: false,
      rejectCategory: 'lighting',
      reason: lighting.reason,
      checks: { lighting, blur, framing, viewMatch }
    };
  }

  if (framing.tier === 'reject') {
    return {
      accepted: false,
      rejectCategory: 'framing',
      reason: framing.reason,
      checks: { lighting, blur, framing, viewMatch }
    };
  }

  if (viewMatch.confidence === 'high' && !viewMatch.match) {
    return {
      accepted: false,
      rejectCategory: 'view',
      reason: viewMatch.reason,
      checks: { lighting, blur, framing, viewMatch }
    };
  }

  // Lenient acceptance: Good or Usable
  return {
    accepted: true,
    reason: null,
    tiers: {
      lighting: lighting.tier,
      blur: blur.tier,
      framing: framing.tier,
      view: viewMatch.confidence === 'high' ? 'good' : 'usable'
    },
    checks: { lighting, blur, framing, viewMatch }
  };
}
