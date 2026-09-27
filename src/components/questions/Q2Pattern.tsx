import React from 'react';
import { QuizQuestionData, BaseOption } from '../../types/quiz';
import { Check } from 'lucide-react';

interface Q2Props {
  question: QuizQuestionData;
  selected: string[];
  onToggle: (id: string) => void;
}

export const Q2Pattern: React.FC<Q2Props> = ({ question, selected, onToggle }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2.5">
      {question.options.map((opt) => {
        const isSel = selected.includes(opt.id);

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`relative text-left px-4 sm:px-3 py-3.5 sm:py-2.5 rounded-2xl transition-all duration-150 cursor-pointer flex items-center justify-between border active:scale-[0.98] min-h-[58px] sm:min-h-0 ${
              isSel
                ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/20 shadow-2xs'
                : 'bg-white border-stone-200 hover:border-emerald-500/60 hover:bg-stone-50/50'
            }`}
            aria-pressed={isSel}
          >
            <div className="flex items-center gap-3 sm:gap-2.5 min-w-0">
              {/* Micro Chart Badge - slightly taller on mobile */}
              <div
                className={`w-16 sm:w-16 h-10 sm:h-8 rounded-xl sm:rounded-lg p-1 flex items-center justify-center shrink-0 transition-colors ${
                  isSel ? 'bg-emerald-100/80' : 'bg-stone-100'
                }`}
              >
                <TrajectoryChart trendType={opt.trendType} isSel={isSel} />
              </div>

              <span
                className={`text-xs sm:text-sm font-semibold transition-colors truncate ${
                  isSel ? 'text-emerald-950 font-bold' : 'text-stone-800'
                }`}
              >
                {opt.label}
              </span>
            </div>

            <div
              className={`w-5 h-5 sm:w-5 sm:h-5 rounded-full border shrink-0 flex items-center justify-center transition-colors ml-2 ${
                isSel
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-stone-300 bg-white text-transparent'
              }`}
            >
              <Check className="w-3 h-3 sm:w-3 sm:h-3 stroke-[3]" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Subtle micro-sparkline trajectory chart for each pattern
function TrajectoryChart({ trendType, isSel }: { trendType?: BaseOption['trendType']; isSel: boolean }) {
  const strokeColor = isSel ? '#15803d' : '#475569';

  switch (trendType) {
    case 'gradual':
      return (
        <svg className="w-full h-full" viewBox="0 0 60 24" fill="none">
          <path d="M 4 20 C 20 18, 40 10, 56 4" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="56" cy="4" r="2.5" fill={strokeColor} />
        </svg>
      );
    case 'sudden':
      return (
        <svg className="w-full h-full" viewBox="0 0 60 24" fill="none">
          <path d="M 4 20 L 25 19 L 28 4 L 56 4" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="28" cy="4" r="2.5" fill={strokeColor} />
        </svg>
      );
    case 'fluctuating':
      return (
        <svg className="w-full h-full" viewBox="0 0 60 24" fill="none">
          <path d="M 4 18 Q 16 4 28 16 T 54 8" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="54" cy="8" r="2.5" fill={strokeColor} />
        </svg>
      );
    case 'stable':
      return (
        <svg className="w-full h-full" viewBox="0 0 60 24" fill="none">
          <line x1="4" y1="12" x2="56" y2="12" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="56" cy="12" r="2.5" fill={strokeColor} />
        </svg>
      );
    default:
      return (
        <svg className="w-full h-full" viewBox="0 0 60 24" fill="none">
          <line x1="6" y1="12" x2="16" y2="12" stroke={strokeColor} strokeWidth="2" strokeDasharray="3 3" />
          <line x1="24" y1="12" x2="36" y2="12" stroke={strokeColor} strokeWidth="2" strokeDasharray="3 3" />
          <line x1="44" y1="12" x2="54" y2="12" stroke={strokeColor} strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );
  }
}
