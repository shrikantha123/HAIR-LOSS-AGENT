import React, { useState } from 'react';
import { AssessmentResult, QuizState } from '../types/quiz';
import {
  Check,
  Printer,
  RotateCcw,
  Stethoscope,
  Activity,
  ShieldCheck,
  Camera,
  ExternalLink
} from 'lucide-react';

interface CompletionScreenProps {
  result: AssessmentResult;
  state: QuizState;
  onRestart: () => void;
  onOpenCaptureModal?: () => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  result,
  state,
  onRestart,
  onOpenCaptureModal,
}) => {
  const [capturedPhotos, setCapturedPhotos] = useState<{ front?: string; crown?: string; side?: string } | null>(() => {
    try {
      const saved = sessionStorage.getItem('anarva_captured_photos');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  return (
    <div className="w-full max-w-xl mx-auto py-3 text-center">

      {/* Done Header */}
      <div className="w-14 h-14 rounded-full bg-[#DCFCE7] border-2 border-[#86EFAC] flex items-center justify-center mx-auto text-[#16A34A] mb-3 shadow-xs">
        <Check className="w-7 h-7 stroke-[2.5]" />
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B1215] tracking-tight mb-1.5">
        Assessment complete
      </h2>

      <p className="text-xs sm:text-sm text-[#5A6B72] max-w-md mx-auto mb-4 leading-relaxed">
        Thank you. Your hair-loss history has been recorded. Our clinical team will review your responses and reach out to you shortly.
      </p>

      {/* Clinical Assessment Report Overview Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DDE5E8] shadow-xs text-left mb-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
            <span>Clinical Trichology Report</span>
          </div>
          <span className="font-mono text-[11px] text-stone-500 font-semibold">{result.id}</span>
        </div>

        {/* Score & Condition */}
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Score</span>
            <div className="text-xl font-black text-emerald-800 leading-tight">
              {result.follicularScore}
              <span className="text-[11px] font-normal text-emerald-600">/10</span>
            </div>
          </div>

          <div className="col-span-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Assessment</span>
            <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight truncate">
              {result.conditionName}
            </h4>
            <span className="text-[10px] text-stone-500 truncate mt-0.5">
              Zones: <strong className="text-emerald-800">{result.affectedZones.join(', ')}</strong>
            </span>
          </div>
        </div>

        {/* Probability Bars */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-700" />
              Androgenetic Alopecia
            </span>
            <span>{result.probabilities.androgenetic}%</span>
          </div>
          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${result.probabilities.androgenetic}%` }} />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700">
            <span>Telogen Effluvium</span>
            <span>{result.probabilities.telogen}%</span>
          </div>
          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-600 rounded-full" style={{ width: `${result.probabilities.telogen}%` }} />
          </div>
        </div>

        {/* Immediate Recommendations */}
        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1">
          <span className="font-bold text-[10px] uppercase text-stone-500 tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-700" />
            Clinical Next Steps
          </span>
          {result.recommendations.slice(0, 2).map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] leading-tight">
              <span className="w-1 h-1 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scalp Photography Section */}
      <div className="bg-white rounded-2xl p-4 border border-[#DDE5E8] shadow-xs text-left mb-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
            <Camera className="w-3.5 h-3.5 text-emerald-700" />
            <span>Clinical Scalp Photography (3 Views)</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700">
            {capturedPhotos ? 'Verified Photos Attached' : 'Recommended'}
          </span>
        </div>

        {capturedPhotos ? (
          <div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['front', 'crown', 'side'] as const).map((view) => (
                <div key={view} className="rounded-xl overflow-hidden border border-stone-200 bg-stone-50 p-1">
                  <div className="aspect-square rounded-lg overflow-hidden bg-black relative mb-1">
                    {capturedPhotos[view] ? (
                      <img src={capturedPhotos[view]} alt={view} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-[10px]">
                        No photo
                      </div>
                    )}
                    <span className="absolute top-1 right-1 bg-emerald-600 text-white text-[8px] font-bold px-1 rounded">
                      Passed
                    </span>
                  </div>
                  <div className="text-[10px] font-bold capitalize text-stone-800 text-center">
                    {view} View
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={onOpenCaptureModal}
                className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retake Scalp Photos</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-stone-600 mb-3">
              Capture or upload 3 standardized scalp views (Front, Crown, and Side) with real-time quality verification for complete dermatological evaluation.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <button
                type="button"
                onClick={onOpenCaptureModal}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Open Scalp Photo Scanner</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
              <span>Supports Live Auto-Capture or Gallery Upload</span>
              <div className="flex items-center gap-2">
                <a
                  href="/scalp-capture/ui-capture.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:underline flex items-center gap-0.5"
                >
                  <span>Live Applet</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span>•</span>
                <a
                  href="/scalp-capture/ui-upload.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:underline flex items-center gap-0.5"
                >
                  <span>Upload Applet</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#DDE5E8] shadow-xs text-left mb-3">
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => window.print()}
            className="font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-700" />
            <span>Print Clinical Report</span>
          </button>

          <button
            onClick={onRestart}
            className="font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Assessment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
