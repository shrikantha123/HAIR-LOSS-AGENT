/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EXACT_QUIZ_QUESTIONS } from './data/quizQuestions';
import { QuizState, AssessmentResult } from './types/quiz';
import { computeAssessment } from './utils/analysisEngine';
import { Q1Onset } from './components/questions/Q1Onset';
import { Q2Pattern } from './components/questions/Q2Pattern';
import { Q3Location } from './components/questions/Q3Location';
import { Q4Shedding } from './components/questions/Q4Shedding';
import { Q5FamilyHistory } from './components/questions/Q5FamilyHistory';
import { Q6RecentEvents } from './components/questions/Q6RecentEvents';
import { Q7ScalpSymptoms } from './components/questions/Q7ScalpSymptoms';
import { Q8PreviousTreatments } from './components/questions/Q8PreviousTreatments';
import { CompletionScreen } from './components/CompletionScreen';
import { ScalpCaptureModal } from './components/scalp-capture/ScalpCaptureModal';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Volume2,
  VolumeX,
  Info,
  Camera
} from 'lucide-react';

export default function App() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [quizState, setQuizState] = useState<QuizState>({
    answers: {},
  });
  const [showError, setShowError] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completedResult, setCompletedResult] = useState<AssessmentResult | null>(null);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);

  const totalQuestions = EXACT_QUIZ_QUESTIONS.length;
  const currentQ = EXACT_QUIZ_QUESTIONS[currentIdx];
  const selectedOptions = currentQ ? quizState.answers[currentQ.id] || [] : [];
  const progressPct = Math.round(((currentIdx + 1) / totalQuestions) * 100);

  // Subtle audio chime
  const playTactileFeedback = useCallback(() => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore
      }
    }
    if (!soundEnabled) return;

    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // AudioContext blocked
    }
  }, [soundEnabled]);

  // Answered validation: just checking if current question has selection
  const isCurrentAnswered = useCallback(() => {
    if (!currentQ) return false;
    const ans = quizState.answers[currentQ.id] || [];
    return ans.length > 0;
  }, [currentQ, quizState]);

  // Handle single and multi selection
  const handleToggleOption = (optionId: string) => {
    if (!currentQ) return;
    playTactileFeedback();
    setShowError(false);

    const qId = currentQ.id;

    if (currentQ.type === 'single') {
      setQuizState((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [qId]: [optionId],
        },
      }));

      // Auto advance on single select after feedback
      if (['q1', 'q2'].includes(qId) && currentIdx < totalQuestions - 1) {
        setTimeout(() => {
          setDirection(1);
          setCurrentIdx((i) => i + 1);
        }, 220);
      }
      return;
    }

    // Multi-select with exclusive options logic
    setQuizState((prev) => {
      const currentList = prev.answers[qId] || [];

      let exclusiveIds: string[] = [];
      if (qId === 'q3') exclusiveIds = ['overall', 'patchy'];
      if (qId === 'q5') exclusiveIds = ['none', 'unsure'];
      if (qId === 'q6') exclusiveIds = ['none6', 'unsure6'];
      if (qId === 'q7') exclusiveIds = ['none7'];
      if (qId === 'q8') exclusiveIds = ['none8'];

      if (exclusiveIds.includes(optionId)) {
        const isAlreadySelected = currentList.includes(optionId);
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [qId]: isAlreadySelected ? [] : [optionId],
          },
        };
      }

      const cleaned = currentList.filter((id) => !exclusiveIds.includes(id));
      const nextList = cleaned.includes(optionId)
        ? cleaned.filter((id) => id !== optionId)
        : [...cleaned, optionId];

      return {
        ...prev,
        answers: {
          ...prev.answers,
          [qId]: nextList,
        },
      };
    });
  };

  const handleNext = () => {
    if (!isCurrentAnswered()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    playTactileFeedback();

    if (currentIdx === totalQuestions - 1) {
      const res = computeAssessment(quizState);
      setCompletedResult(res);
    } else {
      setDirection(1);
      setCurrentIdx((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      playTactileFeedback();
      setShowError(false);
      setDirection(-1);
      setCurrentIdx((i) => i - 1);
    }
  };

  const handleRestart = () => {
    setQuizState({ answers: {} });
    setCurrentIdx(0);
    setCompletedResult(null);
    setShowError(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (completedResult) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isCurrentAnswered()) handleNext();
      } else if (e.key === 'ArrowLeft' && currentIdx > 0) {
        handleBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [completedResult, currentIdx, isCurrentAnswered]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between bg-[#F6F9FA] text-[#0B1215] font-sans antialiased selection:bg-emerald-100 selection:text-emerald-950 overflow-hidden">
      {/* ── HEADER ── */}
      <header className="shrink-0 bg-white border-b border-[#DDE5E8] shadow-xs">
        <div className="max-w-2xl mx-auto px-4 h-12 sm:h-13 flex items-center justify-between">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#16A34A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              A
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-[#0B1215]">
              Anarva <span className="text-[#16A34A]">Clinic</span>
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCaptureModalOpen(true)}
              type="button"
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-[#F0FDF4] hover:bg-emerald-100 border border-[#86EFAC] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Open Scalp Photo Scanner (Front, Crown, Side)"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden xs:inline">Photo Scan</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              type="button"
              className="w-7 h-7 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition-colors"
              title={soundEnabled ? 'Audio on' : 'Audio off'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-stone-400" />
              )}
            </button>

            <span className="text-[11px] font-semibold text-[#16A34A] bg-[#F0FDF4] border border-[#86EFAC] px-2.5 py-0.5 rounded-full hidden sm:inline">
              Hair Loss Assessment
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 min-h-0 flex flex-col justify-center max-w-2xl w-full mx-auto px-3 sm:px-4 py-2.5 sm:py-3 overflow-y-auto">
        {completedResult ? (
          <div className="py-2">
            <CompletionScreen
              result={completedResult}
              state={quizState}
              onRestart={handleRestart}
              onOpenCaptureModal={() => setIsCaptureModalOpen(true)}
            />
          </div>
        ) : (
          <div className="w-full flex flex-col justify-center">
            {/* Progress Bar & Stage Indicator */}
            <div className="mb-2.5 sm:mb-3">
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                <span className="text-[#5A6B72] uppercase tracking-wider">
                  Question {currentQ.qNumber} of {totalQuestions}
                </span>
                <span className="text-[#16A34A] font-bold tabular-nums">
                  {progressPct}%
                </span>
              </div>
              <div className="h-1.5 sm:h-1.5 w-full bg-[#EEF3F5] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-linear-to-r from-[#16A34A] to-[#22C55E] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentQ.id}
                custom={direction}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="bg-white border border-[#DDE5E8] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs"
              >
                {/* Category Label */}
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#16A34A] mb-0.5">
                  {currentQ.label}
                </div>

                {/* Question Title */}
                <h2 className="text-[17px] sm:text-xl font-bold text-[#0B1215] tracking-tight leading-snug">
                  {currentQ.title}
                </h2>

                {/* Subtitle */}
                <p className="text-xs sm:text-xs text-[#5A6B72] mt-0.5 mb-1.5 sm:mb-1 leading-snug">
                  {currentQ.subtitle}
                </p>

                {/* Hint */}
                <div className="flex items-center gap-1 text-[11px] sm:text-[11px] text-[#8FA3AB] font-medium mb-3.5 sm:mb-3">
                  <Info className="w-3 h-3" />
                  <span>{currentQ.hint}</span>
                </div>

                {/* Question Option Views */}
                {currentQ.id === 'q1' && (
                  <Q1Onset
                    question={currentQ}
                    selected={selectedOptions}
                    onToggle={handleToggleOption}
                  />
                )}

                {currentQ.id === 'q2' && (
                  <Q2Pattern
                    question={currentQ}
                    selected={selectedOptions}
                    onToggle={handleToggleOption}
                  />
                )}

                {currentQ.id === 'q3' && (
                  <Q3Location
                    question={currentQ}
                    selected={selectedOptions}
                    onToggle={handleToggleOption}
                  />
                )}

                {currentQ.id === 'q4' && (
                  <Q4Shedding
                    question={currentQ}
                    selected={selectedOptions}
                    onToggle={handleToggleOption}
                  />
                )}

                {currentQ.id === 'q5' && (
                  <Q5FamilyHistory
                    question={currentQ}
                    selected={selectedOptions}
                    onToggle={handleToggleOption}
                  />
                )}

                {currentQ.id === 'q6' && (
                  <Q6RecentEvents
                    question={currentQ}
                    selected={selectedOptions}
                    onToggle={handleToggleOption}
                  />
                )}

                {currentQ.id === 'q7' && (
                  <Q7ScalpSymptoms
                    question={currentQ}
                    selected={selectedOptions}
                    onToggle={handleToggleOption}
                  />
                )}

                {currentQ.id === 'q8' && (
                  <Q8PreviousTreatments
                    question={currentQ}
                    selected={selectedOptions}
                    onToggle={handleToggleOption}
                  />
                )}

                {/* Error Message */}
                {showError && (
                  <div className="mt-2.5 p-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-medium flex items-center gap-1.5 animate-in fade-in duration-100">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {currentQ.id === 'q3'
                        ? 'Please select at least one area to continue.'
                        : 'Please select an option to continue.'}
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAV BAR ── */}
      {!completedResult && (
        <nav className="shrink-0 bg-white border-t border-[#DDE5E8] p-3 sm:py-3 px-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentIdx === 0}
              className={`h-11 sm:h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1 transition-all ${
                currentIdx === 0
                  ? 'invisible'
                  : 'text-[#5A6B72] hover:text-[#0B1215] hover:bg-[#EEF3F5] cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="h-11 sm:h-10 px-6 sm:px-8 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>{currentIdx === totalQuestions - 1 ? 'View Assessment Report' : 'Continue'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      )}

      {/* Scalp Photo Capture & Validation Modal */}
      <ScalpCaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
      />
    </div>
  );
}
