import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  RefreshCw
} from 'lucide-react';
import { evaluatePhoto } from '../../../scalp-capture/validation.js';
import { detectFace } from '../../../scalp-capture/mediapipe-loader.js';

type ViewKey = 'front' | 'crown' | 'side';
type Mode = 'camera' | 'upload';

interface ScalpCaptureScreenProps {
  onRestart: () => void;
  onComplete?: (photos: { front?: string; crown?: string; side?: string }) => void;
}

interface PhotoSlot {
  dataUrl?: string;
  status: 'empty' | 'validating' | 'valid' | 'invalid';
}

export const ScalpCaptureScreen: React.FC<ScalpCaptureScreenProps> = ({
  onRestart,
  onComplete
}) => {
  const [mode, setMode] = useState<Mode>('upload');
  const [submitted, setSubmitted] = useState(false);

  // 3 Required Views
  const views: ViewKey[] = ['front', 'crown', 'side'];
  const viewTitles: Record<ViewKey, string> = {
    front: 'Front View',
    crown: 'Crown View',
    side: 'Side View'
  };

  const [slots, setSlots] = useState<Record<ViewKey, PhotoSlot>>({
    front: { status: 'empty' },
    crown: { status: 'empty' },
    side: { status: 'empty' }
  });

  // Live camera state
  const [cameraViewIdx, setCameraViewIdx] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const activeCameraView = views[cameraViewIdx];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const passHoldStartTimeRef = useRef<number | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);
  const deviceOrientationRef = useRef<{ beta?: number }>({});

  // Device orientation tracking for live crown detection
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

  // Validation function: outputs ONLY 'valid' or 'invalid' - zero code, zero descriptions
  const validateImageDataUrl = useCallback(async (viewKey: ViewKey, dataUrl: string) => {
    setSlots((prev) => ({
      ...prev,
      [viewKey]: { dataUrl, status: 'validating' }
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

      let faceData = null;
      if (viewKey !== 'crown') {
        try {
          faceData = await detectFace(canvas);
        } catch {
          // ignore
        }
      }

      const evalResult = evaluatePhoto(
        imageData,
        viewKey,
        faceData ? faceData.box : null,
        null,
        faceData
      );

      // Strict clean output: Valid Image or Invalid Image only
      setSlots((prev) => ({
        ...prev,
        [viewKey]: {
          dataUrl,
          status: evalResult.accepted ? 'valid' : 'invalid'
        }
      }));
    };

    img.onerror = () => {
      setSlots((prev) => ({
        ...prev,
        [viewKey]: { dataUrl, status: 'invalid' }
      }));
    };

    img.src = dataUrl;
  }, []);

  // Handle file selection
  const handleFileChange = (viewKey: ViewKey, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        validateImageDataUrl(viewKey, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handler
  const handleDrop = (viewKey: ViewKey, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileChange(viewKey, file);
    }
  };

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: activeCameraView === 'crown' ? 'environment' : 'user',
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
    } catch {
      setCameraError('Camera access unavailable. Please use upload mode.');
    }
  }, [activeCameraView]);

  const stopCamera = useCallback(() => {
    isLoopRunningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Snapshot from camera
  const captureCameraFrame = useCallback(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    validateImageDataUrl(activeCameraView, dataUrl);

    passHoldStartTimeRef.current = null;
    setHoldProgress(0);

    if (cameraViewIdx < views.length - 1) {
      setCameraViewIdx((prev) => prev + 1);
    } else {
      setMode('upload');
      stopCamera();
    }
  }, [activeCameraView, cameraViewIdx, stopCamera, validateImageDataUrl, views.length]);

  // Camera video loop
  useEffect(() => {
    if (mode !== 'camera') {
      stopCamera();
      return;
    }
    startCamera();

    let animationId: number;
    let lastTime = 0;
    const interval = 1000 / 10;

    const loop = async (now: number) => {
      if (!isLoopRunningRef.current) return;

      if (now - lastTime > interval) {
        lastTime = now;
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw && vh) {
            const canvas = document.createElement('canvas');
            canvas.width = 360;
            canvas.height = Math.round((vh / vw) * 360);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

              let faceData = null;
              if (activeCameraView !== 'crown') {
                try {
                  faceData = await detectFace(canvas);
                } catch {
                  // ignore
                }
              }

              const evalResult = evaluatePhoto(
                imageData,
                activeCameraView,
                faceData ? faceData.box : null,
                deviceOrientationRef.current,
                faceData
              );

              if (evalResult.accepted) {
                if (!passHoldStartTimeRef.current) {
                  passHoldStartTimeRef.current = performance.now();
                } else {
                  const elapsed = performance.now() - passHoldStartTimeRef.current;
                  const ratio = Math.min(1, elapsed / 850);
                  setHoldProgress(ratio);
                  if (elapsed >= 850) {
                    captureCameraFrame();
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
        animationId = requestAnimationFrame(loop);
      }
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      stopCamera();
    };
  }, [mode, activeCameraView, startCamera, stopCamera, captureCameraFrame]);

  // Overall completion: all 3 views must have status === 'valid'
  const isAllValid =
    slots.front.status === 'valid' &&
    slots.crown.status === 'valid' &&
    slots.side.status === 'valid';

  const handleSubmitAll = () => {
    if (!isAllValid) return;
    const bundle = {
      front: slots.front.dataUrl,
      crown: slots.crown.dataUrl,
      side: slots.side.dataUrl
    };
    try {
      sessionStorage.setItem('anarva_captured_photos', JSON.stringify(bundle));
    } catch {
      // ignore
    }
    if (onComplete) {
      onComplete(bundle);
    }
    setSubmitted(true);
  };

  return (
    <div className="w-full max-w-xl mx-auto py-2 px-1 text-center font-sans">
      {/* Premium Header */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Clinical Scalp Photography</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          Scalp Photo Verification
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-md mx-auto">
          Capture or upload 3 standardized scalp views for your analysis.
        </p>
      </div>

      {/* Mode Switch Tabs */}
      <div className="flex items-center justify-center gap-1 bg-stone-100 p-1 rounded-2xl max-w-xs mx-auto mb-4 border border-stone-200">
        <button
          type="button"
          onClick={() => {
            setMode('upload');
            stopCamera();
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'upload'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('camera');
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'camera'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Camera</span>
        </button>
      </div>

      {/* CAMERA MODE */}
      {mode === 'camera' && (
        <div className="bg-stone-900 rounded-3xl overflow-hidden shadow-xl mb-4 text-white relative flex flex-col items-center">
          <div className="w-full p-3 bg-stone-950 flex items-center justify-between border-b border-stone-800">
            <span className="text-xs font-bold text-emerald-400">
              {viewTitles[activeCameraView]}
            </span>
            <span className="text-[11px] text-stone-400 font-medium">
              Step {cameraViewIdx + 1} of 3
            </span>
          </div>

          <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />

            {/* Oval framing guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                style={{
                  borderColor: holdProgress > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.75)',
                  boxShadow:
                    holdProgress > 0
                      ? '0 0 25px rgba(16, 185, 129, 0.8)'
                      : '0 0 0 9999px rgba(0, 0, 0, 0.45)'
                }}
                className="w-56 h-72 border-3 border-dashed rounded-[50%/55%] transition-all"
              />
            </div>

            {holdProgress > 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hold Steady ({Math.round(holdProgress * 100)}%)</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-stone-900/95 p-4 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-rose-300 mb-3">{cameraError}</p>
                <button
                  onClick={() => setMode('upload')}
                  className="px-4 py-2 bg-emerald-600 rounded-xl text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Switch to Upload
                </button>
              </div>
            )}
          </div>

          <div className="w-full p-3 bg-stone-950 flex items-center justify-between border-t border-stone-800">
            <button
              type="button"
              onClick={() => {
                if (cameraViewIdx > 0) setCameraViewIdx((i) => i - 1);
              }}
              disabled={cameraViewIdx === 0}
              className="text-xs text-stone-400 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={captureCameraFrame}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <Camera className="w-4 h-4" />
              <span>Capture View</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (cameraViewIdx < views.length - 1) setCameraViewIdx((i) => i + 1);
                else setMode('upload');
              }}
              className="text-xs text-stone-400 hover:text-white cursor-pointer"
            >
              {cameraViewIdx === views.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* UPLOAD CARDS (PREMIUM CLINICAL VIEW) */}
      <div className="space-y-3 mb-4 text-left">
        {views.map((v) => {
          const slot = slots[v];
          const inputId = `upload-${v}`;
          const isSlotValid = slot.status === 'valid';
          const isSlotInvalid = slot.status === 'invalid';
          const isValidating = slot.status === 'validating';

          return (
            <div
              key={v}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(v, e)}
              className={`bg-white rounded-2xl p-3.5 border transition-all shadow-xs flex items-center gap-3.5 ${
                isSlotValid
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : isSlotInvalid
                  ? 'border-rose-300 bg-rose-50/20'
                  : 'border-[#DDE5E8]'
              }`}
            >
              {/* Thumbnail */}
              <label
                htmlFor={inputId}
                className={`w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors relative bg-stone-50 ${
                  slot.dataUrl ? 'border-emerald-400 bg-black' : 'border-stone-300 hover:border-emerald-500'
                }`}
              >
                {slot.dataUrl ? (
                  <img src={slot.dataUrl} alt={v} className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-stone-400" />
                )}
              </label>

              {/* View Content & Clean Badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm text-stone-900 tracking-tight">
                    {viewTitles[v]}
                  </span>

                  {/* Strictly Valid Image / Invalid Image / Pending */}
                  {isValidating && (
                    <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 animate-pulse">
                      Checking...
                    </span>
                  )}

                  {isSlotValid && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span>Valid Image</span>
                    </span>
                  )}

                  {isSlotInvalid && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300 shadow-2xs">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                      <span>Invalid Image</span>
                    </span>
                  )}

                  {slot.status === 'empty' && (
                    <span className="text-[11px] font-semibold text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">
                      Required
                    </span>
                  )}
                </div>

                {/* Single Premium Action Button */}
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={inputId}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs inline-block ${
                      isSlotInvalid
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : isSlotValid
                        ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isSlotInvalid ? 'Retake Photo' : isSlotValid ? 'Change Photo' : 'Upload Photo'}
                  </label>

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
                      if (file) handleFileChange(v, file);
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation State or Bottom Action */}
      {submitted ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h3 className="font-extrabold text-stone-900 text-sm">
            All 3 Scalp Photos Successfully Verified
          </h3>
          <p className="text-xs text-stone-500 mt-0.5 mb-3">
            Your clinical photographs have been attached to your assessment intake.
          </p>
          <button
            type="button"
            onClick={onRestart}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart New Assessment</span>
          </button>
        </div>
      ) : (
        <div className="pt-2">
          <button
            type="button"
            disabled={!isAllValid}
            onClick={handleSubmitAll}
            className={`w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
              isAllValid
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <span>Confirm & Submit Photos</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onRestart}
              className="text-stone-500 hover:text-stone-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restart Quiz</span>
            </button>

            <span className="text-[11px] text-stone-400">
              {isAllValid ? 'Ready to submit' : 'All 3 photos must say Valid Image'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
