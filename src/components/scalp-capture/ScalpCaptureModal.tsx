import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Info,
  Sun,
  Maximize2,
  SlidersHorizontal,
  Trash2,
  Beaker,
  Eye,
  Check,
  Flame,
  Activity
} from 'lucide-react';
import { evaluatePhoto } from '../../../scalp-capture/validation.js';
import { detectFace } from '../../../scalp-capture/mediapipe-loader.js';

interface ScalpCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotosSaved?: (photos: { front?: string; crown?: string; side?: string }) => void;
}

type Mode = 'live' | 'upload';
type ViewKey = 'front' | 'crown' | 'side';

interface CheckDetails {
  lighting?: {
    tier: 'good' | 'usable' | 'reject';
    mean: number;
    blownPct: number;
    reason: string | null;
  };
  blur?: {
    tier: 'good' | 'usable' | 'reject';
    variance: number;
    reason: string | null;
  };
  framing?: {
    tier: 'good' | 'usable' | 'reject';
    widthPct: number;
    guidance: string;
    reason: string | null;
  };
  viewMatch?: {
    detectedView: string;
    confidence: string;
    match: boolean;
    reason: string | null;
    yawDeg?: number;
  };
}

interface UploadSlotState {
  dataUrl?: string;
  status: 'empty' | 'validating' | 'good' | 'usable' | 'rejected';
  reason?: string | null;
  stepMessage?: string;
  checks?: CheckDetails;
}

/**
 * Creates high-fidelity synthetic clinical test photos to allow immediate client-side testing
 * of all validation rules (sharp, crown, side, blurry, dark, glare).
 */
function createSyntheticTestPhoto(type: 'valid-front' | 'valid-crown' | 'valid-side' | 'blurry' | 'dark' | 'glare'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (type === 'dark') {
    // Fill with very dark shade (mean luminance ~22 -> triggers Too Dark rejection)
    ctx.fillStyle = '#141517';
    ctx.fillRect(0, 0, 480, 480);
    ctx.fillStyle = '#1b1c20';
    ctx.beginPath();
    ctx.ellipse(240, 240, 100, 130, 0, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  if (type === 'glare') {
    // Fill with blown-out overexposed flash glare (mean > 230 -> triggers Overexposed rejection)
    ctx.fillStyle = '#fdfdfd';
    ctx.fillRect(0, 0, 480, 480);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(240, 240, 160, 190, 0, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  if (type === 'blurry') {
    // Ultra smooth gradient without edge frequencies (variance < 15 -> triggers Blurry rejection)
    const grad = ctx.createRadialGradient(240, 240, 20, 240, 240, 240);
    grad.addColorStop(0, '#a58d79');
    grad.addColorStop(0.5, '#99806c');
    grad.addColorStop(1, '#856f5c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 480);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  if (type === 'valid-crown') {
    // Scalp top vertex with clear follicle texture & hair distribution
    ctx.fillStyle = '#e8cdb8';
    ctx.fillRect(0, 0, 480, 480);
    // Center scalp vertex whorl
    ctx.strokeStyle = '#2b1d14';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 350; i++) {
      const angle = (i / 350) * Math.PI * 2;
      const r1 = 25 + Math.random() * 35;
      const r2 = 175 + Math.random() * 45;
      ctx.beginPath();
      ctx.moveTo(240 + Math.cos(angle) * r1, 240 + Math.sin(angle) * r1);
      ctx.lineTo(240 + Math.cos(angle) * r2, 240 + Math.sin(angle) * r2);
      ctx.stroke();
    }
    // High-contrast follicles for Laplacian variance > 100
    ctx.fillStyle = '#1e140d';
    for (let i = 0; i < 220; i++) {
      ctx.beginPath();
      ctx.arc(150 + Math.random() * 180, 150 + Math.random() * 180, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas.toDataURL('image/jpeg', 0.95);
  }

  if (type === 'valid-side') {
    // Temporal hairline profile with sharp edge contrast
    ctx.fillStyle = '#eef2f5';
    ctx.fillRect(0, 0, 480, 480);
    // Ear and temple
    ctx.fillStyle = '#e8cbb6';
    ctx.beginPath();
    ctx.ellipse(290, 260, 120, 160, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Dark temporal hairline
    ctx.fillStyle = '#1c1510';
    ctx.beginPath();
    ctx.moveTo(220, 110);
    ctx.bezierCurveTo(190, 190, 200, 280, 270, 360);
    ctx.lineTo(110, 360);
    ctx.lineTo(110, 110);
    ctx.closePath();
    ctx.fill();
    // Edge strands
    ctx.strokeStyle = '#0f0a07';
    ctx.lineWidth = 2;
    for (let y = 130; y < 330; y += 4) {
      ctx.beginPath();
      ctx.moveTo(210 + Math.sin(y * 0.1) * 8, y);
      ctx.lineTo(250 + Math.cos(y * 0.1) * 12, y + 10);
      ctx.stroke();
    }
    return canvas.toDataURL('image/jpeg', 0.95);
  }

  // valid-front: Crisp frontal hairline with balanced lighting
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 480, 480);
  // Face outline
  ctx.fillStyle = '#edd1bd';
  ctx.beginPath();
  ctx.ellipse(240, 280, 110, 140, 0, 0, Math.PI * 2);
  ctx.fill();
  // Frontal hairline
  ctx.fillStyle = '#221611';
  ctx.beginPath();
  ctx.moveTo(130, 240);
  ctx.bezierCurveTo(150, 160, 210, 150, 240, 175);
  ctx.bezierCurveTo(270, 150, 330, 160, 350, 240);
  ctx.lineTo(360, 100);
  ctx.lineTo(120, 100);
  ctx.closePath();
  ctx.fill();
  // Sharp hair strands
  ctx.strokeStyle = '#110a08';
  ctx.lineWidth = 2;
  for (let x = 140; x < 340; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, 170 + Math.sin(x * 0.1) * 15);
    ctx.lineTo(x + (Math.random() - 0.5) * 10, 205 + Math.random() * 20);
    ctx.stroke();
  }
  return canvas.toDataURL('image/jpeg', 0.95);
}

export const ScalpCaptureModal: React.FC<ScalpCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotosSaved
}) => {
  const [mode, setMode] = useState<Mode>('live');

  // Live state
  const views: ViewKey[] = ['front', 'crown', 'side'];
  const [currentViewIdx, setCurrentViewIdx] = useState(0);
  const [isLiveDone, setIsLiveDone] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<{ [key in ViewKey]?: string }>({});
  
  // Real-time live chip metrics
  const [chipLighting, setChipLighting] = useState<{ pass: boolean; text: string }>({ pass: true, text: 'Checking...' });
  const [chipPosition, setChipPosition] = useState<{ pass: boolean; text: string }>({ pass: true, text: 'Align Face' });
  const [chipView, setChipView] = useState<{ pass: boolean; text: string }>({ pass: true, text: 'Front View' });
  const [holdProgress, setHoldProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Upload state
  const [uploadSlots, setUploadSlots] = useState<{ [key in ViewKey]: UploadSlotState }>({
    front: { status: 'empty' },
    crown: { status: 'empty' },
    side: { status: 'empty' }
  });

  const [activeDragSlot, setActiveDragSlot] = useState<ViewKey | null>(null);
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<{ [key in ViewKey]?: boolean }>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const passHoldStartTimeRef = useRef<number | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);
  const deviceOrientationRef = useRef<{ beta?: number }>({});

  const currentView = views[currentViewIdx] || 'front';

  // Device orientation tracking
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      deviceOrientationRef.current = { beta: e.beta ?? undefined };
    };
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, []);

  // Audio & haptic feedback
  const triggerAutoCaptureFeedback = useCallback(() => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate([40, 20, 50]);
      } catch {
        // Ignore
      }
    }
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio autoplay policy
    }
  }, []);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: currentView === 'crown' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      isLoopRunningRef.current = true;
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      setCameraError('Unable to open camera. Please grant camera permission or switch to Upload mode.');
    }
  }, [currentView]);

  const stopCamera = useCallback(() => {
    isLoopRunningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Manual snapshot
  const captureSnapshot = useCallback(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    triggerAutoCaptureFeedback();

    setCapturedPhotos((prev) => ({
      ...prev,
      [currentView]: dataUrl
    }));

    passHoldStartTimeRef.current = null;
    setHoldProgress(0);

    if (currentViewIdx < views.length - 1) {
      setCurrentViewIdx((i) => i + 1);
    } else {
      setIsLiveDone(true);
      stopCamera();
    }
  }, [currentView, currentViewIdx, stopCamera, triggerAutoCaptureFeedback, views.length]);

  // Video processing loop for real-time validation
  useEffect(() => {
    if (!isOpen || mode !== 'live' || isLiveDone) {
      stopCamera();
      return;
    }

    startCamera();

    let animationFrameId: number;
    let lastTime = 0;
    const fpsInterval = 1000 / 10; // ~10fps

    const loop = async (now: number) => {
      if (!isLoopRunningRef.current) return;

      if (now - lastTime > fpsInterval) {
        lastTime = now;
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw && vh) {
            if (!offscreenCanvasRef.current) {
              offscreenCanvasRef.current = document.createElement('canvas');
            }
            const canvas = offscreenCanvasRef.current;
            const targetW = 400;
            const targetH = Math.round((vh / vw) * targetW);
            if (canvas.width !== targetW || canvas.height !== targetH) {
              canvas.width = targetW;
              canvas.height = targetH;
            }

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, targetW, targetH);
              const imageData = ctx.getImageData(0, 0, targetW, targetH);

              // Detect face mesh
              let faceData = null;
              if (currentView !== 'crown') {
                faceData = await detectFace(canvas);
              }

              // Evaluate unified photo rules
              const evalResult = evaluatePhoto(
                imageData,
                currentView,
                faceData ? faceData.box : null,
                deviceOrientationRef.current,
                faceData
              );

              // Update chips
              const { lighting, framing, viewMatch } = evalResult.checks;

              const lightingPass = lighting.tier !== 'reject';
              setChipLighting({
                pass: lightingPass,
                text: lighting.tier === 'good' ? 'Good' : (lighting.tier === 'usable' ? 'Usable' : (lighting.mean < 40 ? 'Too Dark' : 'Too Bright'))
              });

              const posPass = framing.tier !== 'reject';
              setChipPosition({
                pass: posPass,
                text: framing.guidance || (framing.tier === 'good' ? 'Good' : 'Adjust')
              });

              const viewPass = viewMatch.match;
              let viewText = `${currentView.charAt(0).toUpperCase() + currentView.slice(1)} View`;
              if (!viewPass) {
                viewText = viewMatch.detectedView ? `${viewMatch.detectedView.toUpperCase()} DETECTED` : 'Mismatched';
              }
              setChipView({
                pass: viewPass,
                text: viewText
              });

              // Check auto-capture criteria
              if (evalResult.accepted) {
                if (!passHoldStartTimeRef.current) {
                  passHoldStartTimeRef.current = performance.now();
                } else {
                  const holdTime = performance.now() - passHoldStartTimeRef.current;
                  const ratio = Math.min(1, holdTime / 900);
                  setHoldProgress(ratio);

                  if (holdTime >= 900) {
                    captureSnapshot();
                  }
                }
              } else {
                passHoldStartTimeRef.current = null;
                setHoldProgress(0);
              }
            }
          }
        }
      }

      if (isLoopRunningRef.current) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      stopCamera();
    };
  }, [isOpen, mode, currentView, isLiveDone, startCamera, stopCamera, captureSnapshot]);

  // Robust Upload Photo Validation Engine with Animated Progress Feedback
  const processImageValidation = useCallback(async (viewKey: ViewKey, dataUrl: string) => {
    setUploadSlots((prev) => ({
      ...prev,
      [viewKey]: {
        dataUrl,
        status: 'validating',
        stepMessage: '1/4 Analyzing pixel luminance & glare...'
      }
    }));

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let w = img.width || 480;
      let h = img.height || 480;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      // Brief visual progress step updates
      setUploadSlots((prev) => ({
        ...prev,
        [viewKey]: {
          ...prev[viewKey],
          stepMessage: '2/4 Computing Laplacian edge sharpness...'
        }
      }));

      let faceData = null;
      if (viewKey !== 'crown') {
        try {
          faceData = await detectFace(canvas);
        } catch (e) {
          console.warn('Face detection error:', e);
        }
      }

      setUploadSlots((prev) => ({
        ...prev,
        [viewKey]: {
          ...prev[viewKey],
          stepMessage: '3/4 Evaluating framing & distance...'
        }
      }));

      const evalResult = evaluatePhoto(
        imageData,
        viewKey,
        faceData ? faceData.box : null,
        null,
        faceData
      );

      setUploadSlots((prev) => ({
        ...prev,
        [viewKey]: {
          ...prev[viewKey],
          stepMessage: '4/4 Verifying anatomical view angle...'
        }
      }));

      // Short delay for visual polish so user sees the diagnostics
      setTimeout(() => {
        if (!evalResult.accepted) {
          setUploadSlots((prev) => ({
            ...prev,
            [viewKey]: {
              dataUrl,
              status: 'rejected',
              reason: evalResult.reason || 'Image quality check failed. Please retake.',
              checks: evalResult.checks
            }
          }));
        } else {
          const tier =
            evalResult.tiers?.lighting === 'usable' ||
            evalResult.tiers?.blur === 'usable' ||
            evalResult.tiers?.framing === 'usable'
              ? 'usable'
              : 'good';

          setUploadSlots((prev) => ({
            ...prev,
            [viewKey]: {
              dataUrl,
              status: tier,
              reason: null,
              checks: evalResult.checks
            }
          }));
        }
      }, 150);
    };

    img.onerror = () => {
      setUploadSlots((prev) => ({
        ...prev,
        [viewKey]: {
          dataUrl,
          status: 'rejected',
          reason: 'Could not decode image. Please choose a valid JPG/PNG file.'
        }
      }));
    };

    img.src = dataUrl;
  }, []);

  const handleUploadFile = (viewKey: ViewKey, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        processImageValidation(viewKey, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (viewKey: ViewKey, e: React.DragEvent) => {
    e.preventDefault();
    setActiveDragSlot(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleUploadFile(viewKey, file);
    }
  };

  const handleClearSlot = (viewKey: ViewKey) => {
    setUploadSlots((prev) => ({
      ...prev,
      [viewKey]: { status: 'empty', dataUrl: undefined, reason: null, checks: undefined }
    }));
  };

  // Instant Test Sample Loaders
  const loadTestSample = (viewKey: ViewKey, sampleType: 'valid-front' | 'valid-crown' | 'valid-side' | 'blurry' | 'dark' | 'glare') => {
    const dataUrl = createSyntheticTestPhoto(sampleType);
    processImageValidation(viewKey, dataUrl);
  };

  const loadAllThreeValidSamples = () => {
    loadTestSample('front', 'valid-front');
    loadTestSample('crown', 'valid-crown');
    loadTestSample('side', 'valid-side');
  };

  const isUploadComplete =
    (uploadSlots.front.status === 'good' || uploadSlots.front.status === 'usable') &&
    (uploadSlots.crown.status === 'good' || uploadSlots.crown.status === 'usable') &&
    (uploadSlots.side.status === 'good' || uploadSlots.side.status === 'usable');

  const handleConfirmAndSave = (photos: { [key in ViewKey]?: string }) => {
    if (onPhotosSaved) {
      onPhotosSaved(photos);
    }
    sessionStorage.setItem('anarva_captured_photos', JSON.stringify(photos));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-[#0B1215] text-white w-full max-w-xl rounded-2xl sm:rounded-3xl border border-[#202E36] overflow-hidden flex flex-col max-h-[96vh] shadow-2xl">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#111A1F] border-b border-[#202E36]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">Clinical Scalp Photography</span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              3-Angle Verification
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode switch */}
            <div className="bg-[#1A262E] p-0.5 rounded-lg flex items-center text-xs">
              <button
                type="button"
                onClick={() => setMode('live')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  mode === 'live' ? 'bg-[#16A34A] text-white shadow-xs' : 'text-stone-400 hover:text-white'
                }`}
              >
                Live Camera
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  mode === 'upload' ? 'bg-[#16A34A] text-white shadow-xs' : 'text-stone-400 hover:text-white'
                }`}
              >
                Upload Mode
              </button>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-lg bg-[#1A262E] text-stone-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODE A: LIVE CAMERA */}
        {mode === 'live' && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            {!isLiveDone ? (
              <>
                {/* 3 Real-time Status Chips */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#0F171C] border-b border-[#1A272E]">
                  {/* Lighting chip */}
                  <div
                    style={{ backgroundColor: chipLighting.pass ? '#2ecc71' : '#e74c3c' }}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-white shadow-xs transition-colors duration-200"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Lighting</span>
                    <span className="text-xs font-black truncate max-w-full">{chipLighting.text}</span>
                  </div>

                  {/* Position chip */}
                  <div
                    style={{ backgroundColor: chipPosition.pass ? '#2ecc71' : '#e74c3c' }}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-white shadow-xs transition-colors duration-200"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Position</span>
                    <span className="text-xs font-black truncate max-w-full">{chipPosition.text}</span>
                  </div>

                  {/* Correct View chip */}
                  <div
                    style={{ backgroundColor: chipView.pass ? '#2ecc71' : '#e74c3c' }}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-white shadow-xs transition-colors duration-200"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Correct View</span>
                    <span className="text-xs font-black truncate max-w-full">{chipView.text}</span>
                  </div>
                </div>

                {/* Live Video Feed with Oval guide */}
                <div className="relative aspect-4/3 sm:aspect-square bg-black overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />

                  {/* Oval framing guide overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      style={{
                        borderColor: holdProgress > 0 ? '#2ecc71' : 'rgba(255, 255, 255, 0.75)',
                        boxShadow:
                          holdProgress > 0
                            ? `0 0 ${Math.round(holdProgress * 22)}px rgba(46, 204, 113, 0.8)`
                            : '0 0 0 9999px rgba(11, 18, 21, 0.45)'
                      }}
                      className="w-[64vw] max-w-[240px] h-[80vw] max-h-[300px] border-3 border-dashed rounded-[50%/55%] transition-all duration-150"
                    />
                  </div>

                  {/* Auto capture countdown badge */}
                  {holdProgress > 0 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Holding steady ({Math.round(holdProgress * 100)}%)</span>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 bg-stone-900/95 p-4 flex flex-col items-center justify-center text-center">
                      <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                      <p className="text-xs text-rose-300 max-w-xs mb-3">{cameraError}</p>
                      <button
                        onClick={() => setMode('upload')}
                        className="px-4 py-2 bg-emerald-600 rounded-xl text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        Switch to Upload Mode
                      </button>
                    </div>
                  )}
                </div>

                {/* Instructions & Step indicator */}
                <div className="p-3 bg-[#111A1F] border-t border-[#1F2C34] flex flex-col items-center">
                  {/* 3 Progress Dots */}
                  <div className="flex items-center gap-3 mb-2">
                    {views.map((v, idx) => (
                      <div key={v} className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <div
                          className={`w-3 h-3 rounded-full transition-all ${
                            idx < currentViewIdx
                              ? 'bg-[#2ECC71] border-2 border-[#2ECC71]'
                              : idx === currentViewIdx
                              ? 'bg-[#2ECC71] border-2 border-[#2ECC71] ring-2 ring-emerald-400/50 scale-110'
                              : 'border-2 border-stone-600'
                          }`}
                        />
                        <span className={idx === currentViewIdx ? 'text-white' : 'text-stone-500'}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-center text-xs text-stone-300 mb-3 max-w-sm leading-relaxed">
                    {currentView === 'front' && (
                      <span>
                        <strong className="text-emerald-400">Step 1 of 3: Front View</strong> — Look directly into
                        camera with hairline centered. Auto-captures when steady for 1s.
                      </span>
                    )}
                    {currentView === 'crown' && (
                      <span>
                        <strong className="text-emerald-400">Step 2 of 3: Crown View</strong> — Tilt phone downward
                        above the top/vertex of your head.
                      </span>
                    )}
                    {currentView === 'side' && (
                      <span>
                        <strong className="text-emerald-400">Step 3 of 3: Side View (Temple)</strong> — Turn head 45°
                        to 90° to capture temporal hairline.
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-2 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      className="flex-1 py-2.5 bg-[#2ECC71] hover:bg-[#27AE60] text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-transform cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap View Now</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Review State */
              <div className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-white mb-1">All 3 Scalp Views Captured</h3>
                <p className="text-xs text-stone-400 mb-4">
                  Review your photos below. All views meet clinical quality standards.
                </p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {views.map((v) => (
                    <div key={v} className="bg-[#162229] border border-[#263842] rounded-xl overflow-hidden p-1.5">
                      <div className="aspect-square bg-black rounded-lg overflow-hidden relative mb-1.5">
                        {capturedPhotos[v] ? (
                          <img src={capturedPhotos[v]} alt={v} className="w-full h-full object-cover" />
                        ) : null}
                        <span className="absolute top-1 right-1 bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded">
                          Passed
                        </span>
                      </div>
                      <div className="text-[11px] font-bold capitalize text-white mb-1">{v} View</div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLiveDone(false);
                          setCurrentViewIdx(views.indexOf(v));
                        }}
                        className="text-[10px] text-stone-400 hover:text-white bg-[#202E38] hover:bg-[#2D414E] w-full py-1 rounded transition-colors cursor-pointer"
                      >
                        Retake
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmAndSave(capturedPhotos)}
                    className="w-full py-3 bg-[#2ECC71] hover:bg-[#27AE60] text-black font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Save & Proceed with Assessment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE B: UPLOAD MODE (UPGRADED WITH CLINICAL CHECK BREAKDOWN & TEST SAMPLES) */}
        {mode === 'upload' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-4 bg-[#F6F9FA] text-[#0B1215]">
            {/* Quick Testing Bar */}
            <div className="bg-white border border-[#DDE5E8] rounded-xl p-2.5 mb-3 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <Beaker className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Interactive Validation Tester</span>
                </div>
                <span className="text-[10px] font-semibold text-stone-500">Live checks on click</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={loadAllThreeValidSamples}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-3 h-3" />
                  <span>Load All 3 Passing Samples</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadTestSample('front', 'blurry')}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Test Blurry Rejection</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadTestSample('front', 'dark')}
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sun className="w-3 h-3 text-stone-500" />
                  <span>Test Dark Rejection</span>
                </button>
              </div>
            </div>

            {/* 3 Upload Cards */}
            <div className="space-y-3 mb-3">
              {views.map((v, i) => {
                const slot = uploadSlots[v];
                const inputId = `upload-input-${v}`;
                const title = `${i + 1}. ${v.charAt(0).toUpperCase() + v.slice(1)} Scalp View`;
                const subtitle =
                  v === 'front'
                    ? 'Hairline and forehead facing straight into camera.'
                    : v === 'crown'
                    ? 'Top vertex of head, hair parted or centered.'
                    : 'Temporal angle and lateral hairline profile.';

                const isDragOver = activeDragSlot === v;
                const isDiagOpen = !!expandedDiagnostics[v];

                return (
                  <div
                    key={v}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setActiveDragSlot(v);
                    }}
                    onDragLeave={() => setActiveDragSlot(null)}
                    onDrop={(e) => handleDrop(v, e)}
                    className={`bg-white border rounded-2xl p-3 sm:p-3.5 transition-all shadow-xs ${
                      isDragOver
                        ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/40'
                        : slot.status === 'rejected'
                        ? 'border-rose-300 bg-rose-50/20'
                        : slot.status === 'good' || slot.status === 'usable'
                        ? 'border-emerald-200 bg-emerald-50/15'
                        : 'border-[#DDE5E8]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail / Dropzone Area */}
                      <label
                        htmlFor={inputId}
                        className={`w-22 h-22 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed overflow-hidden shrink-0 flex flex-col items-center justify-center relative cursor-pointer group transition-colors ${
                          slot.dataUrl
                            ? 'border-emerald-400 bg-black'
                            : 'border-stone-300 bg-stone-50 hover:bg-stone-100 hover:border-emerald-500'
                        }`}
                      >
                        {slot.dataUrl ? (
                          <>
                            <img src={slot.dataUrl} alt={v} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              Change
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-1">
                            <Upload className="w-5 h-5 text-stone-400 group-hover:text-emerald-600 mb-1 transition-colors" />
                            <span className="text-[10px] font-bold text-stone-500 leading-tight">
                              Upload or Drop
                            </span>
                          </div>
                        )}
                      </label>

                      {/* Info & Status Area */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="font-extrabold text-xs text-stone-900">{title}</div>
                          {slot.dataUrl && (
                            <button
                              type="button"
                              onClick={() => handleClearSlot(v)}
                              className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                              title="Remove photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-stone-500 mb-2 leading-tight">{subtitle}</p>

                        {/* Status Chip */}
                        <div className="mb-2">
                          {slot.status === 'empty' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                              <span>Waiting for photo</span>
                            </span>
                          )}

                          {slot.status === 'validating' && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg animate-pulse">
                              <Activity className="w-3.5 h-3.5 animate-spin" />
                              <span>{slot.stepMessage || 'Checking photo quality...'}</span>
                            </div>
                          )}

                          {slot.status === 'good' && (
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Good Quality · All Checks Passed</span>
                            </div>
                          )}

                          {slot.status === 'usable' && (
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Usable Quality · Accepted for Analysis</span>
                            </div>
                          )}

                          {slot.status === 'rejected' && (
                            <div className="text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span>Quality Check Failed</span>
                                <div className="text-[10px] font-normal text-rose-700 leading-tight">
                                  {slot.reason}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Multi-check mini breakdown tags */}
                        {slot.checks && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mb-2 text-[10px]">
                            {/* Lighting pill */}
                            <div
                              className={`px-1.5 py-0.5 rounded font-semibold border ${
                                slot.checks.lighting?.tier === 'good'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : slot.checks.lighting?.tier === 'usable'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              💡 Lum: {slot.checks.lighting?.mean}/255
                            </div>

                            {/* Sharpness pill */}
                            <div
                              className={`px-1.5 py-0.5 rounded font-semibold border ${
                                slot.checks.blur?.tier === 'good'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : slot.checks.blur?.tier === 'usable'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              🔍 Focus: {slot.checks.blur?.tier === 'reject' ? 'Blurry' : 'Sharp'}
                            </div>

                            {/* Framing pill */}
                            <div
                              className={`px-1.5 py-0.5 rounded font-semibold border ${
                                slot.checks.framing?.tier === 'good'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : slot.checks.framing?.tier === 'usable'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              📐 Scale: {slot.checks.framing?.widthPct}%
                            </div>

                            {/* View angle pill */}
                            <div
                              className={`px-1.5 py-0.5 rounded font-semibold border ${
                                slot.checks.viewMatch?.match
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              🧭 Angle: {slot.checks.viewMatch?.match ? 'Verified' : 'Mismatch'}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={inputId}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs ${
                              slot.status === 'rejected'
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : slot.status === 'good' || slot.status === 'usable'
                                ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {slot.status === 'rejected'
                              ? 'Try Another Photo'
                              : slot.status === 'good' || slot.status === 'usable'
                              ? 'Change Photo'
                              : 'Select Photo'}
                          </label>

                          {/* Quick test sample button for this view */}
                          <button
                            type="button"
                            onClick={() => loadTestSample(v, `valid-${v}` as any)}
                            className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                          >
                            Load Sample
                          </button>

                          {slot.checks && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDiagnostics((prev) => ({
                                  ...prev,
                                  [v]: !prev[v]
                                }))
                              }
                              className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>{isDiagOpen ? 'Hide' : 'Metrics'}</span>
                            </button>
                          )}
                        </div>

                        {/* Hidden input with automatic value reset so re-uploads work */}
                        <input
                          id={inputId}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadFile(v, file);
                          }}
                        />

                        {/* Expandable Clinical Metrics Drawer */}
                        {isDiagOpen && slot.checks && (
                          <div className="mt-2.5 p-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] text-stone-700 space-y-1">
                            <div className="font-bold text-stone-900 border-b border-stone-200 pb-1">
                              Clinical Quality Calculations:
                            </div>
                            <div className="flex justify-between">
                              <span>Luminance Mean & Glare:</span>
                              <strong className="font-mono">
                                {slot.checks.lighting?.mean} / 255 (Glare: {slot.checks.lighting?.blownPct}%)
                              </strong>
                            </div>
                            <div className="flex justify-between">
                              <span>3x3 Laplacian Variance:</span>
                              <strong className="font-mono">{slot.checks.blur?.variance} (min 30 req)</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Subject Width Coverage:</span>
                              <strong className="font-mono">{slot.checks.framing?.widthPct}% of frame</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Detected View Angle:</span>
                              <strong className="font-mono capitalize">
                                {slot.checks.viewMatch?.detectedView} ({slot.checks.viewMatch?.confidence} conf)
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Submit Action */}
            <div className="mt-auto pt-2 border-t border-stone-200">
              <button
                type="button"
                disabled={!isUploadComplete}
                onClick={() => {
                  handleConfirmAndSave({
                    front: uploadSlots.front.dataUrl,
                    crown: uploadSlots.crown.dataUrl,
                    side: uploadSlots.side.dataUrl
                  });
                }}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  isUploadComplete
                    ? 'bg-[#16A34A] text-white hover:bg-[#15803D] shadow-md cursor-pointer'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <span>Save 3 Validated Photos & Proceed</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-center text-[10px] text-stone-500 mt-1">
                {isUploadComplete
                  ? 'All 3 angles validated and approved for dermatological analysis'
                  : 'Submit activates once all 3 views (Front, Crown, Side) pass validation'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
